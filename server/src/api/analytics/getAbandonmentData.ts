import { FastifyRequest, FastifyReply } from "fastify";
import { getUserOrApiKeyHasAccessToSite } from "../../lib/auth-utils.js";
import { getClickhouseClient } from "../../lib/clickhouse.js";

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
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const siteId = request.params.site as string;
    const userId = request.query.user_id as string | undefined;
    const startDate = request.query.startDate as string | undefined;
    const endDate = request.query.endDate as string | undefined;
    const limit = parseInt(request.query.limit as string) || 100;
    const offset = parseInt(request.query.offset as string) || 0;

    // Validar acceso
    const hasAccess = await getUserOrApiKeyHasAccessToSite(request, siteId);
    if (!hasAccess) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const client = await getClickhouseClient();

    // Construir query base
    let whereConditions = [
      `site_id = ${siteId}`,
      `event_name = 'onboarding_abandoned'`,
    ];

    // Filtrar por usuario específico si se proporciona
    if (userId) {
      whereConditions.push(`user_id = '${userId}'`);
    }

    // Filtrar por rango de fechas
    if (startDate) {
      whereConditions.push(`toDate(timestamp) >= '${startDate}'`);
    }
    if (endDate) {
      whereConditions.push(`toDate(timestamp) <= '${endDate}'`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Query para obtener datos de abandono
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
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Query para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM events
      WHERE ${whereClause}
    `;

    const [results, countResults] = await Promise.all([
      client.query({ query }),
      client.query({ query: countQuery }),
    ]);

    const data = await results.json<AbandonmentRecord[]>();
    const countData = await countResults.json<{ total: number }[]>();
    const total = countData[0]?.total || 0;

    return reply.send({
      data,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
      meta: {
        site_id: siteId,
        filtered_by_user: userId ? true : false,
        date_range: startDate || endDate ? { startDate, endDate } : null,
      },
    });
  } catch (error) {
    console.error("Error in getAbandonmentData:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
