import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults, getFilterStatement } from "./utils.js";
import { getUserOrApiKeyHasAccessToSite } from "../../lib/auth-utils.js";
import { FilterParams } from "@rybbit/shared";

export type OnboardingStepData = {
  step_name: string;
  step_number: number;
  users_count: number;
  completion_rate: number;
};

export type GetOnboardingFunnelResponse = {
  started: number;
  completed: number;
  abandoned: number;
  completion_rate: number;
  steps: OnboardingStepData[];
  abandonment_by_step: {
    step_name: string;
    step_number: number;
    abandoned_count: number;
  }[];
};

export interface GetOnboardingFunnelRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams;
}

export async function getOnboardingFunnel(
  req: FastifyRequest<GetOnboardingFunnelRequest>,
  res: FastifyReply
) {
  const { site } = req.params;
  const { startDate, endDate, timeZone, filters } = req.query;

  const userHasAccessToSite = await getUserOrApiKeyHasAccessToSite(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = filters ? getFilterStatement(filters) : "";

  // Query for onboarding started count
  const startedQuery = `
    SELECT COUNT(DISTINCT user_id) as count
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND event_name = 'onboarding_started'
      ${timeStatement}
      ${filterStatement}
  `;

  // Query for onboarding completed count
  const completedQuery = `
    SELECT COUNT(DISTINCT user_id) as count
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND event_name = 'onboarding_completed'
      ${timeStatement}
      ${filterStatement}
  `;

  // Query for onboarding abandoned count
  const abandonedQuery = `
    SELECT COUNT(DISTINCT user_id) as count
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND event_name = 'onboarding_abandoned'
      ${timeStatement}
      ${filterStatement}
  `;

  // Query for step completion breakdown
  const stepsQuery = `
    SELECT
      JSONExtractString(toString(props), 'step_name') as step_name,
      JSONExtractInt(toString(props), 'step_number') as step_number,
      COUNT(DISTINCT user_id) as users_count
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND event_name = 'onboarding_step_completed'
      ${timeStatement}
      ${filterStatement}
    GROUP BY step_name, step_number
    ORDER BY step_number ASC
  `;

  // Query for abandonment by step
  const abandonmentByStepQuery = `
    SELECT
      JSONExtractString(toString(props), 'last_step_name') as step_name,
      JSONExtractInt(toString(props), 'last_step_number') as step_number,
      COUNT(DISTINCT user_id) as abandoned_count
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND event_name = 'onboarding_abandoned'
      ${timeStatement}
      ${filterStatement}
    GROUP BY step_name, step_number
    ORDER BY step_number ASC
  `;

  try {
    const [startedResult, completedResult, abandonedResult, stepsResult, abandonmentResult] = 
      await Promise.all([
        clickhouse.query({
          query: startedQuery,
          format: "JSONEachRow",
          query_params: { siteId: Number(site) },
        }),
        clickhouse.query({
          query: completedQuery,
          format: "JSONEachRow",
          query_params: { siteId: Number(site) },
        }),
        clickhouse.query({
          query: abandonedQuery,
          format: "JSONEachRow",
          query_params: { siteId: Number(site) },
        }),
        clickhouse.query({
          query: stepsQuery,
          format: "JSONEachRow",
          query_params: { siteId: Number(site) },
        }),
        clickhouse.query({
          query: abandonmentByStepQuery,
          format: "JSONEachRow",
          query_params: { siteId: Number(site) },
        }),
      ]);

    const startedData = await processResults<{ count: number }>(startedResult);
    const completedData = await processResults<{ count: number }>(completedResult);
    const abandonedData = await processResults<{ count: number }>(abandonedResult);
    const stepsData = await processResults<OnboardingStepData>(stepsResult);
    const abandonmentData = await processResults<{
      step_name: string;
      step_number: number;
      abandoned_count: number;
    }>(abandonmentResult);

    const started = startedData[0]?.count || 0;
    const completed = completedData[0]?.count || 0;
    const abandoned = abandonedData[0]?.count || 0;

    // Calculate completion rate for each step
    const stepsWithRate = stepsData.map((step) => ({
      ...step,
      completion_rate: started > 0 ? (step.users_count / started) * 100 : 0,
    }));

    const response: GetOnboardingFunnelResponse = {
      started,
      completed,
      abandoned,
      completion_rate: started > 0 ? (completed / started) * 100 : 0,
      steps: stepsWithRate,
      abandonment_by_step: abandonmentData,
    };

    return res.send({ data: response });
  } catch (error) {
    console.error("Error fetching onboarding funnel:", error);
    return res.status(500).send({ error: "Failed to fetch onboarding funnel" });
  }
}
