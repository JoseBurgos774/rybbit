import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "./utils.js";
import { getUserOrApiKeyHasAccessToSite } from "../../lib/auth-utils.js";
import { FilterParams } from "@rybbit/shared";

export type GetWeeklyActiveAccountsResponse = {
  weekly_active_users: number;
  week_start: string;
  week_end: string;
  unique_sessions: number;
  total_events: number;
}[];

export interface GetWeeklyActiveAccountsRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{
    weeks?: string;
  }>;
}

export async function getWeeklyActiveAccounts(
  req: FastifyRequest<GetWeeklyActiveAccountsRequest>,
  res: FastifyReply
) {
  const { site } = req.params;
  const { weeks = "4", timeZone = "UTC" } = req.query;

  const userHasAccessToSite = await getUserOrApiKeyHasAccessToSite(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const weeksNum = Math.min(Math.max(parseInt(weeks, 10) || 4, 1), 52);

  const query = `
    SELECT
      COUNT(DISTINCT user_id) as weekly_active_users,
      toStartOfWeek(timestamp, 1) as week_start,
      toStartOfWeek(timestamp, 1) + INTERVAL 6 DAY as week_end,
      COUNT(DISTINCT session_id) as unique_sessions,
      COUNT(*) as total_events
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND timestamp >= now() - INTERVAL {weeks:Int32} WEEK
      AND user_id IS NOT NULL
      AND user_id != ''
    GROUP BY week_start
    ORDER BY week_start DESC
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        weeks: weeksNum,
      },
    });

    const data = await processResults<GetWeeklyActiveAccountsResponse[number]>(result);
    
    return res.send({
      data,
      meta: {
        weeks_requested: weeksNum,
        timezone: timeZone,
      },
    });
  } catch (error) {
    console.error("Error fetching weekly active accounts:", error);
    return res.status(500).send({ error: "Failed to fetch weekly active accounts" });
  }
}
