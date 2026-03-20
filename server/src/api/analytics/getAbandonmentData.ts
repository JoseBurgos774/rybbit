import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getUserOrApiKeyHasAccessToSite } from "../../lib/auth-utils.js";
import { processResults } from "./utils.js";
import { getEasyOrderUsersByIds } from "../../db/easyorder/easyorder.js";
import { db } from "../../db/postgres/postgres.js";
import { trackedUserProfiles } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";

interface AbandonmentRecord {
  user_id: string;
  last_step_number: number;
  last_step_name: string;
  duration_ms: number;
  onboarding_mode: string;
  total_steps: number;
  abandoned_at: string;
  progress_percentage: number;
}

interface EnrichedAbandonmentRecord extends AbandonmentRecord {
  email: string | null;
  phone: string | null;
  name: string | null;
}

export async function getAbandonmentData(
  req: FastifyRequest,
  res: FastifyReply
) {
  const { site } = req.params as { site: string };
  const queryParams = req.query as any;
  const user_id = queryParams.user_id as string | undefined;
  const startDate = queryParams.startDate as string | undefined;
  const endDate = queryParams.endDate as string | undefined;
  const uniqueUsers = queryParams.unique_users === "true"; // Nuevo parámetro
  const limitParam = queryParams.limit ? parseInt(queryParams.limit as string) : 100;
  const offsetParam = queryParams.offset ? parseInt(queryParams.offset as string) : 0;

  const limit = Math.max(1, Math.min(1000, limitParam || 100));
  const offset = Math.max(0, offsetParam || 0);

  try {

    // Construir query base
    let whereConditions = [
      `site_id = {siteId:Int32}`,
      `event_name = 'onboarding_abandoned'`,
    ];

    const params: Record<string, any> = {
      siteId: Number(site),
      limit,
      offset,
    };

    if (user_id) {
      whereConditions.push(`user_id = {userId:String}`);
      params.userId = user_id;
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

    // Query diferente si queremos usuarios únicos (solo el último abandono de cada usuario)
    const query = uniqueUsers
      ? `
      SELECT
        user_id,
        argMax(JSONExtractInt(toString(props), 'last_step_number'), timestamp) as last_step_number,
        argMax(JSONExtractString(toString(props), 'last_step_name'), timestamp) as last_step_name,
        argMax(JSONExtractInt(toString(props), 'duration_ms'), timestamp) as duration_ms,
        argMax(JSONExtractString(toString(props), 'onboarding_mode'), timestamp) as onboarding_mode,
        argMax(JSONExtractInt(toString(props), 'total_steps'), timestamp) as total_steps,
        max(timestamp) as abandoned_at,
        COUNT(*) as abandonment_count,
        if(
          argMax(JSONExtractInt(toString(props), 'total_steps'), timestamp) > 0,
          ROUND(argMax(JSONExtractInt(toString(props), 'last_step_number'), timestamp) * 100.0 / argMax(JSONExtractInt(toString(props), 'total_steps'), timestamp)),
          0
        ) as progress_percentage
      FROM events
      WHERE ${whereClause}
      GROUP BY user_id
      ORDER BY abandoned_at DESC
      LIMIT {limit:Int32} OFFSET {offset:Int32}
    `
      : `
      SELECT
        user_id,
        JSONExtractInt(toString(props), 'last_step_number') as last_step_number,
        JSONExtractString(toString(props), 'last_step_name') as last_step_name,
        JSONExtractInt(toString(props), 'duration_ms') as duration_ms,
        JSONExtractString(toString(props), 'onboarding_mode') as onboarding_mode,
        JSONExtractInt(toString(props), 'total_steps') as total_steps,
        timestamp as abandoned_at,
        if(
          JSONExtractInt(toString(props), 'total_steps') > 0,
          ROUND(JSONExtractInt(toString(props), 'last_step_number') * 100.0 / JSONExtractInt(toString(props), 'total_steps')),
          0
        ) as progress_percentage
      FROM events
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:Int32} OFFSET {offset:Int32}
    `;

    // Query para contar total de registros
    const countQuery = uniqueUsers
      ? `
      SELECT COUNT(DISTINCT user_id) as total
      FROM events
      WHERE ${whereClause}
    `
      : `
      SELECT COUNT(*) as total
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

    const data = await processResults<AbandonmentRecord>(results);
    const countData = await processResults<{ total: number }>(countResults);
    const total = countData[0]?.total || 0;

    // Enrich with contact data (email, phone, name)
    const userIds = data.map((record) => record.user_id);
    const siteId = Number(site);

    // 1. Get from local tracked_user_profiles
    const localProfiles = new Map<string, { email: string | null; phone: string | null; name: string | null }>();
    if (userIds.length > 0) {
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
    }

    // 2. For users without local profiles, fetch from EasyOrder
    const userIdsWithoutProfiles = userIds.filter((id) => !localProfiles.has(id));
    const easyOrderUsers = userIdsWithoutProfiles.length > 0
      ? await getEasyOrderUsersByIds(userIdsWithoutProfiles)
      : new Map();

    // 3. Merge contact data into abandonment records
    const enrichedData: EnrichedAbandonmentRecord[] = data.map((record) => {
      const localProfile = localProfiles.get(record.user_id);
      const easyOrderUser = easyOrderUsers.get(record.user_id);

      return {
        ...record,
        email: localProfile?.email || easyOrderUser?.correo_electronico || null,
        phone: localProfile?.phone || easyOrderUser?.telefono || null,
        name: localProfile?.name || easyOrderUser?.nombre || null,
      };
    });

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
        filtered_by_user: user_id ? true : false,
        date_range: startDate || endDate ? { startDate, endDate } : null,
      },
    });
  } catch (error) {
    console.error("Error fetching abandonment data:", error);
    return res.status(500).send({ error: "Failed to fetch abandonment data" });
  }
}
