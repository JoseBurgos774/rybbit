# Rybbit Analytics Export API

## Overview

This document describes the new analytics export functionality added to Rybbit for EasyOrder integration. It includes:

1. **User Profile Capture** - Store email and phone for tracked users
2. **CSV Export Endpoint** - Export comprehensive analytics data

## Endpoints

### 1. POST `/api/identify` - Store User Profile

Stores user contact information (email, phone) for a tracked user. This endpoint is called automatically when a user is identified in the admin panel.

**Request Body:**
```json
{
  "site_id": "1",
  "user_id": "123",
  "email": "user@example.com",
  "phone": "+52 555 123 4567",
  "name": "John Doe",
  "traits": {
    "plan_key": "premium",
    "rol_id": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User profile updated"
}
```

### 2. GET `/api/analytics/export-csv/:site` - Export Analytics CSV

Exports comprehensive analytics data as a CSV file. Supports date filtering and optional user profile inclusion.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |
| `timeZone` | string | Timezone (e.g., "America/Mexico_City") |
| `includeUserProfiles` | string | Set to "true" to include email/phone |
| `filters` | string | JSON-encoded filters array |

**Example Request:**
```
GET /api/analytics/export-csv/1?startDate=2024-01-01&endDate=2024-01-31&timeZone=America/Mexico_City&includeUserProfiles=true
```

**CSV Columns:**
| Column | Description |
|--------|-------------|
| `user_id` | Unique user identifier |
| `email` | User email (if available) |
| `phone` | User phone (if available) |
| `user_name` | User name (if available) |
| `total_pageviews` | Total page views |
| `pageviews_with_interaction` | Page views with interaction |
| `total_sessions` | Total sessions |
| `sessions_with_interaction` | Sessions with interaction |
| `is_active_user` | 1 if user has >2 sessions |
| `is_new_user` | 1 if user has only 1 session |
| `is_returning_user` | 1 if user has >1 session |
| `device_type` | Device type (desktop/mobile/tablet) |
| `first_device_type` | First device used |
| `browser` | Browser name |
| `operating_system` | Operating system |
| `screen_dimensions` | Screen dimensions (e.g., "1920x1080") |
| `country` | Country code |
| `region` | Region/State |
| `city` | City name |
| `bounce_rate` | Bounce rate percentage |
| `interaction_rate` | Interaction rate percentage |
| `avg_session_duration_seconds` | Average session duration |
| `first_referrer` | First referrer URL |
| `session_source` | Session source/channel |
| `entry_page` | Entry page path |
| `exit_page` | Exit page path |
| `top_page` | Most visited page |
| `first_seen` | First visit timestamp |
| `last_seen` | Last visit timestamp |

### 3. GET `/api/analytics/summary/:site` - Get Analytics Summary

Returns aggregated analytics summary for the site.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_pageviews": 15000,
    "pageviews_with_interaction": 8500,
    "total_sessions": 5000,
    "sessions_with_interaction": 3200,
    "total_users": 2500,
    "active_users": 800,
    "new_users": 1200,
    "returning_users": 1300,
    "bounce_rate": 35.5,
    "interaction_rate": 64.0,
    "avg_session_duration_seconds": 245.5
  }
}
```

## Metrics Comparison with Google Analytics

| Rybbit Metric | Google Analytics Equivalent |
|---------------|----------------------------|
| `total_pageviews` | Vistas |
| `pageviews_with_interaction` | Vistas con interacción |
| `total_sessions` | Sesiones |
| `sessions_with_interaction` | Sesiones con interacción |
| `is_active_user` | Usuarios activos (>2 visitas) |
| `is_new_user` / `is_returning_user` | Usuarios nuevos/recurrentes |
| `device_type` | Medio del usuario |
| `first_device_type` | Primer medio del usuario |
| `bounce_rate` | Porcentaje de rebote |
| `interaction_rate` | Porcentaje de interacciones |
| `avg_session_duration_seconds` | Duración media de la sesión |
| `country`, `region`, `city` | País, Región, Ciudad |
| `total_users` | Total de usuarios |
| `session_source` | Fuente de la sesión |
| `entry_page` | Ruta de página (entrada) |

## Database Schema

### tracked_user_profiles Table

```sql
CREATE TABLE tracked_user_profiles (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(site_id),
    user_id TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    name TEXT,
    traits JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(site_id, user_id)
);
```

## Frontend Integration

The admin frontend automatically sends user profile data when a user logs in:

```typescript
// In identity-manager.ts
identityManager.setAuthenticatedUser({
  id: usuario.id,
  correo_electronico: usuario.correo_electronico,
  telefono: usuario.telefono,
  nombre: usuario.nombre,
  rol_id: usuario.rol_id,
  plan_key: usuario.plan_key,
});
```

This triggers:
1. `window.rybbit.identify()` - Standard Rybbit identification
2. `POST /api/identify` - Stores email/phone in PostgreSQL

## Authentication

- `/api/identify` - Public endpoint (called from tracking script)
- `/api/analytics/export-csv/:site` - Requires authentication or API key
- `/api/analytics/summary/:site` - Requires authentication or API key

## Usage Example

### Export CSV with curl

```bash
# With API key
curl -H "X-API-Key: rb_your_api_key" \
  "https://your-rybbit-host/api/analytics/export-csv/1?startDate=2024-01-01&endDate=2024-01-31&timeZone=America/Mexico_City&includeUserProfiles=true" \
  -o analytics_export.csv

# With session cookie
curl -b "session=your_session_cookie" \
  "https://your-rybbit-host/api/analytics/export-csv/1?startDate=2024-01-01&endDate=2024-01-31&timeZone=America/Mexico_City&includeUserProfiles=true" \
  -o analytics_export.csv
```

### Get Summary with JavaScript

```javascript
const response = await fetch(
  `/api/analytics/summary/1?startDate=2024-01-01&endDate=2024-01-31&timeZone=America/Mexico_City`,
  {
    headers: {
      'X-API-Key': 'rb_your_api_key'
    }
  }
);
const data = await response.json();
console.log(data);
```
