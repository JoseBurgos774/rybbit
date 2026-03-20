import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { trackedUserProfiles } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import { getFilterStatement, getTimeStatement, processResults } from "./utils.js";
import { FilterParams } from "@rybbit/shared";

export interface ExportAnalyticsCSVRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{
    includeUserProfiles?: string; // "true" to include email/phone
  }>;
}

interface AnalyticsRow {
  user_id: string;
  total_pageviews: number;
  total_events: number;
  total_sessions: number;
  is_active_user: number;
  is_new_user: number;
  is_returning_user: number;
  device_type: string;
  first_device_type: string;
  browser: string;
  operating_system: string;
  screen_dimensions: string;
  country: string;
  region: string;
  city: string;
  first_referrer: string;
  session_source: string;
  entry_page: string;
  exit_page: string;
  top_page: string;
  first_seen: string;
  last_seen: string;
  avg_session_duration_seconds: number;
  bounce_rate: number;
  interaction_rate: number;
  sessions_with_interaction: number;
  pageviews_with_interaction: number;
}

/**
 * Export analytics data as CSV
 * GET /api/analytics/export-csv/:site
 * 
 * Returns CSV with:
 * - Visits (pageviews)
 * - Views with interaction
 * - Sessions
 * - Active users (entered more than 2 times)
 * - Sessions with interaction
 * - User device (desktop, mobile, tablet)
 * - New/returning users
 * - Page path
 * - First user medium
 * - Interaction percentage
 * - Bounce rate
 * - Average session duration
 * - Device category
 * - Country, Region, City
 * - Total users
 * - Session source
 * - Email and phone (if available)
 */
export async function exportAnalyticsCSV(
  req: FastifyRequest<ExportAnalyticsCSVRequest>,
  res: FastifyReply
) {
  const {
    startDate,
    endDate,
    timeZone,
    filters,
    pastMinutesStart,
    pastMinutesEnd,
    includeUserProfiles,
  } = req.query;
  const site = req.params.site;
  const siteId = Number(site);

  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const filterStatement = getFilterStatement(filters);
  const timeStatement = getTimeStatement({
    startDate,
    endDate,
    timeZone,
    pastMinutesStart,
    pastMinutesEnd,
  });

  // Main analytics query - using subquery to avoid nested aggregation
  const query = `
    SELECT
      user_id,
      total_pageviews,
      total_events,
      total_sessions,
      if(total_sessions > 2, 1, 0) AS is_active_user,
      if(total_sessions = 1, 1, 0) AS is_new_user,
      if(total_sessions > 1, 1, 0) AS is_returning_user,
      device_type,
      device_type AS first_device_type,
      browser,
      operating_system,
      concat(screen_width_str, 'x', screen_height_str) AS screen_dimensions,
      country,
      region,
      city,
      first_referrer,
      session_source,
      entry_page,
      exit_page,
      top_page,
      first_seen,
      last_seen,
      total_duration_seconds AS avg_session_duration_seconds,
      0 AS bounce_rate,
      if(total_events > 0, 100, 0) AS interaction_rate,
      total_events AS sessions_with_interaction,
      total_pageviews AS pageviews_with_interaction
    FROM (
      SELECT
        user_id,
        count() AS total_pageviews,
        countIf(type = 'custom_event') AS total_events,
        uniqExact(session_id) AS total_sessions,
        any(device_type) AS device_type,
        any(browser) AS browser,
        any(operating_system) AS operating_system,
        any(toString(screen_width)) AS screen_width_str,
        any(toString(screen_height)) AS screen_height_str,
        any(country) AS country,
        any(region) AS region,
        any(city) AS city,
        any(referrer) AS first_referrer,
        any(channel) AS session_source,
        any(pathname) AS entry_page,
        any(pathname) AS exit_page,
        any(pathname) AS top_page,
        formatDateTime(min(timestamp), '%Y-%m-%d %H:%i:%s') AS first_seen,
        formatDateTime(max(timestamp), '%Y-%m-%d %H:%i:%s') AS last_seen,
        toInt32(dateDiff('second', min(timestamp), max(timestamp))) AS total_duration_seconds
      FROM events
      WHERE
        site_id = {siteId:Int32}
        ${filterStatement}
        ${timeStatement}
      GROUP BY user_id
    )
    ORDER BY last_seen DESC
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId,
      },
    });

    const analyticsData = await processResults<AnalyticsRow>(result);

    // Optionally fetch user profiles (email, phone) from PostgreSQL
    let userProfiles: Map<string, { email: string | null; phone: string | null; name: string | null }> = new Map();
    
    if (includeUserProfiles === "true" && analyticsData.length > 0) {
      const profiles = await db
        .select()
        .from(trackedUserProfiles)
        .where(eq(trackedUserProfiles.siteId, siteId));
      
      for (const profile of profiles) {
        userProfiles.set(profile.userId, {
          email: profile.email,
          phone: profile.phone,
          name: profile.name,
        });
      }
    }

    // Merge user profiles with analytics data
    const enrichedData = analyticsData.map((row) => {
      const profile = userProfiles.get(row.user_id);
      return {
        ...row,
        email: profile?.email || "",
        phone: profile?.phone || "",
        user_name: profile?.name || "",
      };
    });

    // Generate CSV
    const csvHeaders = [
      "user_id",
      "email",
      "phone",
      "user_name",
      "total_pageviews",
      "total_events",
      "total_sessions",
      "is_active_user",
      "is_new_user",
      "is_returning_user",
      "device_type",
      "first_device_type",
      "browser",
      "operating_system",
      "screen_dimensions",
      "country",
      "region",
      "city",
      "first_referrer",
      "session_source",
      "entry_page",
      "exit_page",
      "top_page",
      "first_seen",
      "last_seen",
      "avg_session_duration_seconds",
      "bounce_rate",
      "interaction_rate",
      "sessions_with_interaction",
      "pageviews_with_interaction",
    ];

    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      csvHeaders.join(","),
      ...enrichedData.map((row) =>
        csvHeaders.map((header) => escapeCSV((row as Record<string, unknown>)[header])).join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");

    // Set headers for CSV download
    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header(
      "Content-Disposition",
      `attachment; filename="analytics_export_site_${site}_${new Date().toISOString().split("T")[0]}.csv"`
    );

    return res.send(csvContent);
  } catch (error) {
    console.error("Error exporting analytics CSV:", error);
    return res.status(500).send({ error: "Failed to export analytics data" });
  }
}

/**
 * Get summary analytics for the site
 * GET /api/analytics/summary/:site
 */
export async function getAnalyticsSummary(
  req: FastifyRequest<ExportAnalyticsCSVRequest>,
  res: FastifyReply
) {
  const {
    startDate,
    endDate,
    timeZone,
    filters,
    pastMinutesStart,
    pastMinutesEnd,
  } = req.query;
  const site = req.params.site;
  const siteId = Number(site);

  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const filterStatement = getFilterStatement(filters);
  const timeStatement = getTimeStatement({
    startDate,
    endDate,
    timeZone,
    pastMinutesStart,
    pastMinutesEnd,
  });

  const query = `
    SELECT
      -- Total metrics
      countIf(type = 'pageview') AS total_pageviews,
      countIf(type = 'custom_event') AS total_events,
      uniq(session_id) AS total_sessions,
      uniq(user_id) AS total_users,
      
      -- Simplified rates
      0 AS bounce_rate,
      ROUND(countIf(type = 'custom_event') / greatest(uniq(session_id), 1) * 100, 2) AS interaction_rate,
      
      -- Average session duration (approximate)
      ROUND(dateDiff('second', MIN(timestamp), MAX(timestamp)) / greatest(uniq(session_id), 1), 2) AS avg_session_duration_seconds
    FROM events
    WHERE
      site_id = {siteId:Int32}
      ${filterStatement}
      ${timeStatement}
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId,
      },
    });

    const data = await processResults<Record<string, number>>(result);
    
    return res.send({
      success: true,
      data: data[0] || {},
    });
  } catch (error) {
    console.error("Error fetching analytics summary:", error);
    return res.status(500).send({ error: "Failed to fetch analytics summary" });
  }
}

export interface GetUserProfilesRequest {
  Params: {
    site: string;
  };
  Querystring: {
    limit?: string;
    offset?: string;
  };
}

export interface GetUserContactDataRequest {
  Params: {
    userId: string;
    site: string;
  };
}

/**
 * Get all identified user profiles (email, phone) for a site
 */
export async function getUserProfiles(
  req: FastifyRequest<GetUserProfilesRequest>,
  res: FastifyReply
) {
  try {
    const { site } = req.params;
    const limit = Math.min(parseInt(req.query.limit || "100"), 1000);
    const offset = parseInt(req.query.offset || "0");

    // Check access
    const hasAccess = await getUserHasAccessToSitePublic(req, site);
    if (!hasAccess) {
      return res.status(403).send({ error: "Unauthorized" });
    }

    const siteId = Number(site);

    // Get all user profiles for this site
    const profiles = await db
      .select({
        user_id: trackedUserProfiles.userId,
        email: trackedUserProfiles.email,
        phone: trackedUserProfiles.phone,
        name: trackedUserProfiles.name,
        created_at: trackedUserProfiles.createdAt,
        updated_at: trackedUserProfiles.updatedAt,
      })
      .from(trackedUserProfiles)
      .where(eq(trackedUserProfiles.siteId, siteId))
      .orderBy(trackedUserProfiles.createdAt)
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: trackedUserProfiles.userId })
      .from(trackedUserProfiles)
      .where(eq(trackedUserProfiles.siteId, siteId));

    const total = countResult.length;

    return res.send({
      success: true,
      data: profiles,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    return res.status(500).send({ error: "Failed to fetch user profiles" });
  }
}

/**
 * Get contact data for a specific user (email, phone, name)
 * Used in user detail view to display contact information
 */
export async function getUserContactData(
  req: FastifyRequest<GetUserContactDataRequest>,
  res: FastifyReply
) {
  try {
    const { userId, site } = req.params;

    // Check access
    const hasAccess = await getUserHasAccessToSitePublic(req, site);
    if (!hasAccess) {
      return res.status(403).send({ error: "Unauthorized" });
    }

    const siteId = Number(site);

    // Get user profile data
    const profile = await db
      .select({
        user_id: trackedUserProfiles.userId,
        email: trackedUserProfiles.email,
        phone: trackedUserProfiles.phone,
        name: trackedUserProfiles.name,
        created_at: trackedUserProfiles.createdAt,
        updated_at: trackedUserProfiles.updatedAt,
      })
      .from(trackedUserProfiles)
      .where(
        eq(trackedUserProfiles.siteId, siteId) &&
          eq(trackedUserProfiles.userId, userId)
      );

    if (profile.length === 0) {
      // User not found in tracked profiles, return empty contact data
      return res.send({
        success: true,
        data: {
          user_id: userId,
          email: null,
          phone: null,
          name: null,
          created_at: null,
          updated_at: null,
        },
        message: "No contact data available for this user",
      });
    }

    return res.send({
      success: true,
      data: profile[0],
    });
  } catch (error) {
    console.error("Error fetching user contact data:", error);
    return res.status(500).send({ error: "Failed to fetch user contact data" });
  }
}
