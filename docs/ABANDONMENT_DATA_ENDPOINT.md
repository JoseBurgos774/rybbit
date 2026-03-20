# Endpoint de Datos de Abandono de Onboarding

## Descripción

Endpoint en Rybbit que permite obtener datos de usuarios que abandonaron el onboarding en un paso específico. Útil para automatizar campañas de re-engagement con m8n.

## Endpoint

```
GET /api/analytics/abandonment-data/:site
```

## Ubicación del Código

- **Archivo:** `server/src/api/analytics/getAbandonmentData.ts`
- **Importación:** `server/src/index.ts` (línea 36)
- **Ruta registrada:** `server/src/index.ts` (línea 290)
- **ANALYTICS_ROUTES:** `server/src/index.ts` (línea 188)

## Parámetros

### Path Parameters
- `site` (required): ID del sitio

### Query Parameters
- `user_id` (optional): ID del usuario específico para filtrar
- `startDate` (optional): Fecha inicio en formato YYYY-MM-DD
- `endDate` (optional): Fecha fin en formato YYYY-MM-DD
- `limit` (optional): Número de registros a retornar (default: 100, max: 1000)
- `offset` (optional): Offset para paginación (default: 0)

## Autenticación

Requiere API Key válida para el sitio:

```bash
# Opción 1: Header
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"

# Opción 2: Query Parameter
curl "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?api_key=rb_your_api_key"
```

## Ejemplos de Uso

### 1. Obtener todos los abandonos del sitio

```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
```

### 2. Obtener abandono específico del usuario 442

```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?user_id=442"
```

### 3. Obtener abandonos en rango de fechas

```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?startDate=2026-02-01&endDate=2026-03-05"
```

### 4. Obtener abandonos con paginación

```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?limit=50&offset=0"
```

## Respuesta

### Estructura

```json
{
  "data": [
    {
      "user_id": "442",
      "email": "usuario@ejemplo.com",
      "phone": "+5216871234567",
      "name": "Juan Pérez",
      "last_step_number": 2,
      "last_step_name": "Horarios",
      "duration_ms": 1200000,
      "onboarding_mode": "manual",
      "total_steps": 11,
      "abandoned_at": "2026-02-15T10:50:00Z",
      "progress_percentage": 18
    }
  ],
  "pagination": {
    "total": 145,
    "limit": 100,
    "offset": 0,
    "pages": 2
  },
  "meta": {
    "site_id": "2",
    "filtered_by_user": true,
    "date_range": null
  }
}
```

### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | string | ID del usuario que abandonó |
| `email` | string/null | **Correo electrónico del usuario** (desde EasyOrder DB) |
| `phone` | string/null | **Teléfono del usuario** (cuando esté disponible) |
| `name` | string/null | **Nombre del usuario** (desde EasyOrder DB) |
| `last_step_number` | number | Número del último paso alcanzado (0-indexed) |
| `last_step_name` | string | Nombre del paso donde abandonó |
| `duration_ms` | number | Tiempo total en onboarding (milisegundos) |
| `onboarding_mode` | string | Modo de onboarding ('manual' o 'plantilla') |
| `total_steps` | number | Total de pasos en el flujo |
| `abandoned_at` | string | Timestamp ISO del abandono |
| `progress_percentage` | number | Porcentaje de progreso completado |

### Fuentes de Datos de Contacto

Los campos `email`, `phone` y `name` se obtienen de:

1. **Tabla local `tracked_user_profiles`** - Datos enviados via `/api/identify`
2. **BD de EasyOrder** - Consulta directa a la tabla `usuarios` (requiere `EASYORDER_DATABASE_URL`)

Si no hay datos disponibles, los campos serán `null`.

## Casos de Uso

### 1. Re-engagement automático con m8n

Obtener usuarios que abandonaron en pasos específicos para enviar mensajes personalizados:

```bash
# Usuarios que abandonaron en "Productos" (paso 6)
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2" | \
  jq '.data[] | select(.last_step_name == "Productos")'
```

### 2. Análisis de abandonment rate

Identificar qué pasos tienen más abandonos:

```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?limit=1000" | \
  jq '.data | group_by(.last_step_name) | map({step: .[0].last_step_name, count: length})'
```

### 3. Segmentación por progreso

Obtener usuarios que abandonaron temprano (< 30% progreso):

```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?limit=1000" | \
  jq '.data[] | select(.progress_percentage < 30)'
```

## Integración con m8n

### Workflow de Re-engagement

```yaml
name: Onboarding Abandonment Re-engagement
description: Envía mensajes personalizados a usuarios que abandonaron onboarding

triggers:
  - type: schedule
    cron: "0 9 * * *"  # Diariamente a las 9 AM

actions:
  - name: Get Abandoned Users
    type: http
    config:
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      method: GET
      headers:
        X-API-Key: "${RYBBIT_API_KEY}"

  - name: Filter Early Abandonments
    type: filter
    config:
      condition: "progress_percentage < 30"

  - name: Send WhatsApp Message
    type: whatsapp
    config:
      # ✅ Ahora el teléfono viene directamente en la respuesta
      to: "${phone}"
      template: "onboarding_abandonment_reengagement"
      variables:
        # ✅ El nombre viene directamente en la respuesta
        nombre: "${name}"
        last_step: "${last_step_name}"
        progress: "${progress_percentage}"
        link: "https://app.easyorder.app/onboarding/resume?user_id=${user_id}&step=${last_step_number}"

  - name: Send Email (alternativo)
    type: email
    config:
      # ✅ El email viene directamente en la respuesta
      to: "${email}"
      subject: "¡Continúa configurando tu restaurante!"
      template: "onboarding_reminder"
      variables:
        nombre: "${name}"
        last_step: "${last_step_name}"
        progress: "${progress_percentage}"

  - name: Track Re-engagement
    type: http
    config:
      url: "https://api-rybbit.nexgen.systems/api/track"
      method: POST
      body:
        event_name: "reengagement_message_sent"
        user_id: "${user_id}"
        properties:
          abandonment_step: "${last_step_name}"
          progress_percentage: "${progress_percentage}"
          contact_method: "whatsapp"
```

### Ejemplo de Respuesta con Datos de Contacto

```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?user_id=442"
```

**Respuesta:**
```json
{
  "data": [
    {
      "user_id": "442",
      "email": "juan.perez@gmail.com",
      "phone": "+5216871234567",
      "name": "Juan Pérez",
      "last_step_number": 2,
      "last_step_name": "Horarios",
      "duration_ms": 1200000,
      "onboarding_mode": "manual",
      "total_steps": 11,
      "abandoned_at": "2026-02-15T10:50:00Z",
      "progress_percentage": 18
    }
  ]
}
```

Ahora puedes usar directamente `${email}`, `${phone}` y `${name}` en tus workflows de m8n sin necesidad de consultar otra API.

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 200 | Éxito |
| 400 | Parámetros inválidos |
| 403 | No autorizado (API Key inválida o sin acceso al sitio) |
| 500 | Error interno del servidor |

## Notas

- El endpoint usa ClickHouse para consultas rápidas
- Los datos se filtran automáticamente por `site_id`
- La paginación es obligatoria para evitar sobrecargas (máx 1000 registros por request)
- Los timestamps están en UTC
- El `progress_percentage` se calcula como: `(last_step_number / total_steps) * 100`
