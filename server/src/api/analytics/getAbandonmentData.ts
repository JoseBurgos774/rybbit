import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getUserOrApiKeyHasAccessToSite } from "../../lib/auth-utils.js";
import { processResults } from "./utils.js";

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

export async function getAbandonmentData(
  req: FastifyRequest,
  res: FastifyReply
) {
  const { site } = req.params as { site: string };
  const queryParams = req.query as any;
  const user_id = queryParams.user_id as string | undefined;
  const startDate = queryParams.startDate as string | undefined;
  const endDate = queryParams.endDate as string | undefined;
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

    const query = `
      SELECT
        user_id,
        JSONExtractInt(properties, 'last_step_number') as last_step_number,
        JSONExtractString(properties, 'last_step_name') as last_step_name,
        JSONExtractInt(properties, 'duration_ms') as duration_ms,
        JSONExtractString(properties, 'onboarding_mode') as onboarding_mode,
        JSONExtractInt(properties, 'total_steps') as total_steps,
        timestamp as abandoned_at,
        ROUND(
          JSONExtractInt(properties, 'last_step_number') * 100.0 / 
          JSONExtractInt(properties, 'total_steps')
        ) as progress_percentage
      FROM events
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:Int32} OFFSET {offset:Int32}
    `;

    // Query para contar total de registros
    const countQuery = `
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

    return res.send({
      data,
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
