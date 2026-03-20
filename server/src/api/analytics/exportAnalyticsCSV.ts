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
  // User identification
  user_id: string;
  email?: string;
  phone?: string;
  user_name?: string;
  
  // Visits & Sessions
  total_pageviews: number;
  pageviews_with_interaction: number;
  total_sessions: number;
  sessions_with_interaction: number;
  
  // User classification
  is_active_user: boolean; // entered more than 2 times
  is_new_user: boolean;
  is_returning_user: boolean;
  
  // Device info
  device_type: string;
  first_device_type: string;
  browser: string;
  operating_system: string;
  screen_dimensions: string;
  
  // Location
  country: string;
  region: string;
  city: string;
  
  // Session metrics
  bounce_rate: number;
  interaction_rate: number;
  avg_session_duration_seconds: number;
  
  // Traffic source
  first_referrer: string;
  session_source: string;
  
  // Page paths
  entry_page: string;
  exit_page: string;
  top_page: string;
  
  // Timestamps
  first_seen: string;
  last_seen: string;
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

  // Main analytics query - comprehensive user-level analytics
  const query = `
    WITH 
    -- Get all user events
    UserEvents AS (
      SELECT
        user_id,
        session_id,
        timestamp,
        pathname,
        type,
        device_type,
        browser,
        operating_system,
        screen_width,
        screen_height,
        country,
        region,
        city,
        referrer,
        channel,
        event_name
      FROM events
      WHERE
        site_id = {siteId:Int32}
        ${filterStatement}
        ${timeStatement}
    ),
    
    -- Session-level aggregations
    SessionStats AS (
      SELECT
        user_id,
        session_id,
        MIN(timestamp) AS session_start,
        MAX(timestamp) AS session_end,
        COUNT(*) AS events_in_session,
        countIf(type = 'pageview') AS pageviews_in_session,
        countIf(type = 'custom_event') AS custom_events_in_session,
        argMin(pathname, timestamp) AS entry_page,
        argMax(pathname, timestamp) AS exit_page,
        argMin(device_type, timestamp) AS device_type,
        argMin(browser, timestamp) AS browser,
        argMin(operating_system, timestamp) AS operating_system,
        argMin(screen_width, timestamp) AS screen_width,
        argMin(screen_height, timestamp) AS screen_height,
        argMin(country, timestamp) AS country,
        argMin(region, timestamp) AS region,
        argMin(city, timestamp) AS city,
        argMin(referrer, timestamp) AS referrer,
        argMin(channel, timestamp) AS channel,
        -- Session has interaction if it has custom events or more than 1 pageview
        IF(custom_events_in_session > 0 OR pageviews_in_session > 1, 1, 0) AS has_interaction
      FROM UserEvents
      GROUP BY user_id, session_id
    ),
    
    -- User-level aggregations
    UserStats AS (
      SELECT
        user_id,
        
        -- Total metrics
        SUM(pageviews_in_session) AS total_pageviews,
        SUM(IF(has_interaction = 1, pageviews_in_session, 0)) AS pageviews_with_interaction,
        COUNT(DISTINCT session_id) AS total_sessions,
        SUM(has_interaction) AS sessions_with_interaction,
        
        -- Is active user (more than 2 sessions)
        IF(COUNT(DISTINCT session_id) > 2, 1, 0) AS is_active_user,
        
        -- Device info (most recent)
        argMax(device_type, session_end) AS device_type,
        argMin(device_type, session_start) AS first_device_type,
        argMax(browser, session_end) AS browser,
        argMax(operating_system, session_end) AS operating_system,
        argMax(concat(toString(screen_width), 'x', toString(screen_height)), session_end) AS screen_dimensions,
        
        -- Location (most recent)
        argMax(country, session_end) AS country,
        argMax(region, session_end) AS region,
        argMax(city, session_end) AS city,
        
        -- Bounce rate (sessions with only 1 pageview and no events)
        SUM(IF(pageviews_in_session = 1 AND has_interaction = 0, 1, 0)) / COUNT(DISTINCT session_id) * 100 AS bounce_rate,
        
        -- Interaction rate
        SUM(has_interaction) / COUNT(DISTINCT session_id) * 100 AS interaction_rate,
        
        -- Average session duration
        AVG(dateDiff('second', session_start, session_end)) AS avg_session_duration_seconds,
        
        -- Traffic source
        argMin(referrer, session_start) AS first_referrer,
        argMax(channel, session_end) AS session_source,
        
        -- Entry/exit pages (most common)
        argMax(entry_page, session_end) AS entry_page,
        argMax(exit_page, session_end) AS exit_page,
        
        -- Timestamps
        MIN(session_start) AS first_seen,
        MAX(session_end) AS last_seen
      FROM SessionStats
      GROUP BY user_id
    ),
    
    -- Get top page per user
    TopPages AS (
      SELECT
        user_id,
        pathname AS top_page,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY COUNT(*) DESC) AS rn
      FROM UserEvents
      WHERE type = 'pageview'
      GROUP BY user_id, pathname
    )
    
    SELECT
      u.user_id,
      u.total_pageviews,
      u.pageviews_with_interaction,
      u.total_sessions,
      u.sessions_with_interaction,
      u.is_active_user,
      IF(u.total_sessions = 1, 1, 0) AS is_new_user,
      IF(u.total_sessions > 1, 1, 0) AS is_returning_user,
      u.device_type,
      u.first_device_type,
      u.browser,
      u.operating_system,
      u.screen_dimensions,
      u.country,
      u.region,
      u.city,
      ROUND(u.bounce_rate, 2) AS bounce_rate,
      ROUND(u.interaction_rate, 2) AS interaction_rate,
      ROUND(u.avg_session_duration_seconds, 2) AS avg_session_duration_seconds,
      u.first_referrer,
      u.session_source,
      u.entry_page,
      u.exit_page,
      COALESCE(tp.top_page, '') AS top_page,
      formatDateTime(u.first_seen, '%Y-%m-%d %H:%M:%S') AS first_seen,
      formatDateTime(u.last_seen, '%Y-%m-%d %H:%M:%S') AS last_seen
    FROM UserStats u
    LEFT JOIN TopPages tp ON u.user_id = tp.user_id AND tp.rn = 1
    ORDER BY u.last_seen DESC
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
      "pageviews_with_interaction",
      "total_sessions",
      "sessions_with_interaction",
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
      "bounce_rate",
      "interaction_rate",
      "avg_session_duration_seconds",
      "first_referrer",
      "session_source",
      "entry_page",
      "exit_page",
      "top_page",
      "first_seen",
      "last_seen",
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
    WITH 
    SessionStats AS (
      SELECT
        session_id,
        user_id,
        MIN(timestamp) AS session_start,
        MAX(timestamp) AS session_end,
        countIf(type = 'pageview') AS pageviews_in_session,
        countIf(type = 'custom_event') AS custom_events_in_session,
        IF(countIf(type = 'custom_event') > 0 OR countIf(type = 'pageview') > 1, 1, 0) AS has_interaction
      FROM events
      WHERE
        site_id = {siteId:Int32}
        ${filterStatement}
        ${timeStatement}
      GROUP BY session_id, user_id
    ),
    UserSessionCounts AS (
      SELECT
        user_id,
        COUNT(DISTINCT session_id) AS session_count
      FROM SessionStats
      GROUP BY user_id
    )
    SELECT
      -- Total metrics
      SUM(pageviews_in_session) AS total_pageviews,
      SUM(IF(has_interaction = 1, pageviews_in_session, 0)) AS pageviews_with_interaction,
      COUNT(DISTINCT session_id) AS total_sessions,
      SUM(has_interaction) AS sessions_with_interaction,
      COUNT(DISTINCT user_id) AS total_users,
      
      -- Active users (more than 2 sessions)
      (SELECT COUNT(*) FROM UserSessionCounts WHERE session_count > 2) AS active_users,
      
      -- New vs returning
      (SELECT COUNT(*) FROM UserSessionCounts WHERE session_count = 1) AS new_users,
      (SELECT COUNT(*) FROM UserSessionCounts WHERE session_count > 1) AS returning_users,
      
      -- Rates
      ROUND(SUM(IF(pageviews_in_session = 1 AND has_interaction = 0, 1, 0)) / COUNT(DISTINCT session_id) * 100, 2) AS bounce_rate,
      ROUND(SUM(has_interaction) / COUNT(DISTINCT session_id) * 100, 2) AS interaction_rate,
      
      -- Average session duration
      ROUND(AVG(dateDiff('second', session_start, session_end)), 2) AS avg_session_duration_seconds
    FROM SessionStats
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
