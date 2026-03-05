import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getUserOrApiKeyHasAccessToSite } from "../../lib/auth-utils.js";
import { processResults } from "./utils.js";

interface OnboardingEvent {
  event_name: string;
  timestamp: string;
  step_number?: number;
  step_name?: string;
  last_step_number?: number;
  last_step_name?: string;
  duration_ms?: number;
  onboarding_mode?: string;
  total_steps?: number;
}

export async function getUserOnboardingEvents(
  req: FastifyRequest,
  res: FastifyReply
) {
  const { site, user_id } = req.params as { site: string; user_id: string };

  const userHasAccessToSite = await getUserOrApiKeyHasAccessToSite(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  try {
    const query = `
      SELECT
        event_name,
        timestamp,
        JSONExtractInt(toString(props), 'step_number') as step_number,
        JSONExtractString(toString(props), 'step_name') as step_name,
        JSONExtractInt(toString(props), 'last_step_number') as last_step_number,
        JSONExtractString(toString(props), 'last_step_name') as last_step_name,
        JSONExtractInt(toString(props), 'duration_ms') as duration_ms,
        JSONExtractString(toString(props), 'onboarding_mode') as onboarding_mode,
        JSONExtractInt(toString(props), 'total_steps') as total_steps
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND user_id = {userId:String}
        AND event_name LIKE 'onboarding_%'
      ORDER BY timestamp ASC
    `;

    const results = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        userId: user_id,
      },
    });

    const events = await processResults<OnboardingEvent>(results);

    // Calcular progreso y estado
    let status = "in_progress";
    let progress_percentage = 0;

    if (events.length > 0) {
      const lastEvent = events[events.length - 1];

      if (lastEvent.event_name === "onboarding_completed") {
        status = "completed";
        progress_percentage = 100;
      } else if (lastEvent.event_name === "onboarding_abandoned") {
        status = "abandoned";
        if (lastEvent.last_step_number && lastEvent.total_steps) {
          progress_percentage = Math.round(
            (lastEvent.last_step_number / lastEvent.total_steps) * 100
          );
        }
      } else if (lastEvent.event_name === "onboarding_step_completed") {
        if (lastEvent.step_number && lastEvent.total_steps) {
          progress_percentage = Math.round(
            ((lastEvent.step_number + 1) / lastEvent.total_steps) * 100
          );
        }
      }
    }

    return res.send({
      user_id,
      status,
      progress_percentage,
      total_events: events.length,
      events,
    });
  } catch (error) {
    console.error("Error fetching user onboarding events:", error);
    return res.status(500).send({ error: "Failed to fetch onboarding events" });
  }
}
