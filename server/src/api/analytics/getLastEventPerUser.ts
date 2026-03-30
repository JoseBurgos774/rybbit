import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getUserOrApiKeyHasAccessToSite } from "../../lib/auth-utils.js";
import { processResults } from "./utils.js";
import { getEasyOrderUsersByIds } from "../../db/easyorder/easyorder.js";
import { db } from "../../db/postgres/postgres.js";
import { trackedUserProfiles } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";

interface LastEventRecord {
  user_id: string;
  event_name: string;
  timestamp: string;
  pathname: string;
  hostname: string;
  browser: string;
  operating_system: string;
  country: string;
  device_type: string;
  properties: string;
  type: string;
  page_title: string;
}

interface EnrichedLastEventRecord extends LastEventRecord {
  email: string | null;
  phone: string | null;
  name: string | null;
}

export async function getLastEventPerUser(
  req: FastifyRequest,
  res: FastifyReply
) {
  const { site } = req.params as { site: string };
  const queryParams = req.query as any;

  const limitParam = queryParams.limit
    ? parseInt(queryParams.limit as string)
    : 100;
  const offsetParam = queryParams.offset
    ? parseInt(queryParams.offset as string)
    : 0;
  const eventType = queryParams.eventType as string | undefined; // "pageview", "custom_event", or undefined for all
  const eventName = queryParams.eventName as string | undefined; // filter by specific event name
  const startDate = queryParams.startDate as string | undefined;
  const endDate = queryParams.endDate as string | undefined;
  const enrichContact = queryParams.enrichContact !== "false"; // default true

  const limit = Math.max(1, Math.min(1000, limitParam || 100));
  const offset = Math.max(0, offsetParam || 0);

  const userHasAccessToSite = await getUserOrApiKeyHasAccessToSite(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  try {
    // Build WHERE conditions
    const whereConditions = [
      `site_id = {siteId:Int32}`,
      `user_id != ''`, // Only identified users
    ];

    const params: Record<string, any> = {
      siteId: Number(site),
      limit,
      offset,
    };

    if (eventType) {
      whereConditions.push(`type = {eventType:String}`);
      params.eventType = eventType;
    }

    if (eventName) {
      whereConditions.push(`event_name = {eventName:String}`);
      params.eventName = eventName;
    }

    if (startDate) {
      whereConditions.push(`toDate(timestamp) >= {startDate:Date}`);
      params.startDate = startDate;
    }

    if (endDate) {
      whereConditions.push(`toDate(timestamp) <= {endDate:Date}`);
      params.endDate = endDate;
    }

    const whereClause = whereConditions.join(" AND ");

    // Query: get the last event per user using ROW_NUMBER window function
    // First get the latest event per user, then select those rows
    const query = `
      SELECT
        user_id,
        event_name,
        timestamp,
        pathname,
        hostname,
        browser,
        operating_system,
        country,
        device_type,
        properties,
        type,
        page_title
      FROM (
        SELECT
          user_id,
          event_name,
          timestamp,
          pathname,
          hostname,
          browser,
          operating_system,
          country,
          device_type,
          toString(props) as properties,
          type,
          page_title,
          ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp DESC) as rn
        FROM events
        WHERE ${whereClause}
      )
      WHERE rn = 1
      ORDER BY timestamp DESC
      LIMIT {limit:Int32} OFFSET {offset:Int32}
    `;

    // Count query: total unique users
    const countQuery = `
      SELECT COUNT(DISTINCT user_id) as total
      FROM events
      WHERE ${whereClause}
    `;

    const [results, countResults] = await Promise.all([
      clickhouse.query({
        query,
        format: "JSONEachRow",
        query_params: params,
      }),
      clickhouse.query({
        query: countQuery,
        format: "JSONEachRow",
        query_params: params,
      }),
    ]);

    const data = await processResults<LastEventRecord>(results);
    const countData = await processResults<{ total: number }>(countResults);
    const total = countData[0]?.total || 0;

    // Enrich with contact data if requested
    let enrichedData: EnrichedLastEventRecord[];

    if (enrichContact && data.length > 0) {
      const userIds = data.map((record) => record.user_id);
      const siteId = Number(site);

      // 1. Get from local tracked_user_profiles
      const localProfiles = new Map<
        string,
        { email: string | null; phone: string | null; name: string | null }
      >();

      const profiles = await db
        .select()
        .from(trackedUserProfiles)
        .where(eq(trackedUserProfiles.siteId, siteId));

      for (const profile of profiles) {
        if (userIds.includes(profile.userId)) {
          localProfiles.set(profile.userId, {
            email: profile.email,
            phone: profile.phone,
            name: profile.name,
          });
        }
      }

      // 2. For users without local profiles, fetch from EasyOrder
      const userIdsWithoutProfiles = userIds.filter((id) => !localProfiles.has(id));
      const easyOrderUsers = userIdsWithoutProfiles.length > 0
        ? await getEasyOrderUsersByIds(userIdsWithoutProfiles)
        : new Map();

      // 3. Merge contact data into event records
      enrichedData = data.map((record) => {
        const localProfile = localProfiles.get(record.user_id);
        const easyOrderUser = easyOrderUsers.get(record.user_id);

        return {
          ...record,
          email: localProfile?.email || easyOrderUser?.correo_electronico || null,
          phone: localProfile?.phone || easyOrderUser?.telefono || null,
          name: localProfile?.name || easyOrderUser?.nombre || null,
        };
      });
    } else {
      enrichedData = data.map((record) => ({
        ...record,
        email: null,
        phone: null,
        name: null,
      }));
    }

    return res.send({
      data: enrichedData,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
      meta: {
        site_id: site,
        filters: {
          eventType: eventType || null,
          eventName: eventName || null,
          startDate: startDate || null,
          endDate: endDate || null,
          enrichContact,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching last event per user:", error);
    return res
      .status(500)
      .send({ error: "Failed to fetch last event per user" });
  }
}
