# Autenticación con API Key para Endpoints GET de Analytics

## Descripción

Esta funcionalidad permite obtener datos de analytics mediante peticiones GET utilizando una API key, **sin necesidad de iniciar sesión**. Ideal para integraciones con herramientas como n8n, Zapier, o cualquier sistema de automatización.

## Cambios Realizados

### 1. `server/src/lib/siteConfig.ts`

**Nuevos métodos agregados:**

```typescript
// Valida una API key y retorna el siteId asociado (o null si es inválida)
validateApiKey(apiKey: string): number | null

// Verifica si una API key es válida para un sitio específico
isApiKeyValidForSite(apiKey: string, siteId: string | number): boolean
```

### 2. `server/src/index.ts`

**Modificaciones:**

- **Hook `onRequest`**: Ahora verifica API key antes de requerir sesión para rutas de analytics
- **CORS**: Agregado `X-API-Key` a los headers permitidos
- **TypeScript**: Agregado tipo `apiKeyAuth` a la interfaz `FastifyRequest`

### 3. `server/src/lib/auth-utils.ts`

**Nuevas funciones:**

```typescript
// Verifica si el request tiene acceso por API key a un sitio
hasApiKeyAccessToSite(req: FastifyRequest, siteId: string | number): boolean

// Verifica acceso por sesión O API key (útil para endpoints que soportan ambos)
getUserOrApiKeyHasAccessToSite(req: FastifyRequest, siteId: string | number): Promise<boolean>
```

---

## Cómo Usar

### Paso 1: Generar una API Key

1. Inicia sesión en Rybbit
2. Ve a la configuración del sitio
3. En la sección "API", genera una nueva API key
4. Guarda la API key (formato: `rb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Paso 2: Hacer Peticiones GET

Puedes enviar la API key de dos formas:

#### Opción A: Header `X-API-Key` (Recomendado)

```bash
curl -H "X-API-Key: rb_tu_api_key_aqui" \
  "https://tu-rybbit.com/api/overview/1?startDate=2024-01-01&endDate=2024-01-31&timeZone=America/Mexico_City"
```

#### Opción B: Query Parameter `api_key`

```bash
curl "https://tu-rybbit.com/api/overview/1?api_key=rb_tu_api_key_aqui&startDate=2024-01-01&endDate=2024-01-31&timeZone=America/Mexico_City"
```

---

## Endpoints Disponibles

Todos los endpoints GET de analytics funcionan con API key.

### Endpoints sin parámetros obligatorios

| Endpoint | Descripción |
|----------|-------------|
| `/api/overview/:site` | Métricas generales (sesiones, pageviews, usuarios) |
| `/api/users/:site` | Lista de usuarios |
| `/api/user/info/:userId/:site` | Información de un usuario |
| `/api/events/names/:site` | Nombres de eventos únicos |
| `/api/retention/:site` | Datos de retención |
| `/api/funnels/:site` | Lista de embudos |
| `/api/goals/:site` | Lista de objetivos |
| `/api/journeys/:site` | Journeys de usuarios |
| `/api/live-user-count/:site` | Usuarios en tiempo real |
| `/api/page-titles/:site` | Títulos de páginas |
| `/api/error-names/:site` | Nombres de errores |
| `/api/performance/overview/:site` | Métricas de rendimiento |
| `/api/session-replay/list/:site` | Lista de session replays |

### Endpoints con parámetros obligatorios

| Endpoint | Parámetros Requeridos | Ejemplo |
|----------|----------------------|---------|
| `/api/overview-bucketed/:site` | `timeZone` | `?timeZone=America/Mexico_City` |
| `/api/sessions/:site` | `page` (o `offset`) | `?page=1` |
| `/api/session/:sessionId/:site` | - | `/api/session/abc123/2` |
| `/api/user/:userId/sessions/:site` | - | `/api/user/124/sessions/2` |
| `/api/events/:site` | `startDate`, `endDate` | `?startDate=2024-01-01&endDate=2024-01-31` |
| `/api/events/properties/:site` | `eventName` | `?eventName=login_completed` |
| `/api/live-session-locations/:site` | `minutes` | `?minutes=5` |
| `/api/single-col/:site` | `parameter` | `?parameter=browser` |
| `/api/error-events/:site` | `errorMessage` | `?errorMessage=TypeError` |
| `/api/error-bucketed/:site` | `errorMessage`, `timeZone` | `?errorMessage=TypeError&timeZone=UTC` |
| `/api/performance/time-series/:site` | `timeZone` | `?timeZone=America/Mexico_City` |
| `/api/performance/by-dimension/:site` | `dimension` | `?dimension=browser` |
| `/api/session-replay/:sessionId/:site` | - | `/api/session-replay/abc123/2` |

### Parámetros comunes opcionales

La mayoría de endpoints aceptan estos parámetros opcionales para filtrar datos:

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `startDate` | Fecha inicio (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | Fecha fin (YYYY-MM-DD) | `2024-01-31` |
| `timeZone` | Zona horaria | `America/Mexico_City` |
| `filters` | Filtros JSON | `[{"parameter":"browser","value":["Chrome"]}]` |

---

## Pruebas

### Prueba 1: Verificar que funciona con API key válida

```bash
# Reemplaza con tu URL, siteId y API key
curl -v -H "X-API-Key: rb_tu_api_key" \
  "http://localhost:3001/api/overview/1?startDate=2024-01-01&endDate=2024-12-31&timeZone=UTC"
```

**Respuesta esperada (200 OK):**
```json
{
  "data": {
    "sessions": 150,
    "pageviews": 500,
    "users": 80,
    "pages_per_session": 3.33,
    "bounce_rate": 45.5,
    "session_duration": 180
  }
}
```

### Prueba 2: Verificar que falla con API key inválida

```bash
curl -v -H "X-API-Key: rb_invalid_key" \
  "http://localhost:3001/api/overview/1?startDate=2024-01-01&endDate=2024-12-31&timeZone=UTC"
```

**Respuesta esperada (401 Unauthorized):**
```json
{
  "error": "Unauthorized 1"
}
```

### Prueba 3: Verificar que falla sin API key ni sesión

```bash
curl -v "http://localhost:3001/api/overview/1?startDate=2024-01-01&endDate=2024-12-31&timeZone=UTC"
```

**Respuesta esperada (401 Unauthorized):**
```json
{
  "error": "Unauthorized 1"
}
```

### Prueba 4: Verificar que API key de un sitio no funciona para otro sitio

```bash
# API key del sitio 1, intentando acceder al sitio 2
curl -v -H "X-API-Key: rb_api_key_sitio_1" \
  "http://localhost:3001/api/overview/2?startDate=2024-01-01&endDate=2024-12-31&timeZone=UTC"
```

**Respuesta esperada (401 Unauthorized):**
```json
{
  "error": "Unauthorized 1"
}
```

### Prueba 5: Verificar query param `api_key`

```bash
curl -v "http://localhost:3001/api/overview/1?api_key=rb_tu_api_key&startDate=2024-01-01&endDate=2024-12-31&timeZone=UTC"
```

**Respuesta esperada (200 OK):** Misma respuesta que Prueba 1

---

## Posibles Errores y Soluciones

### Error: `401 Unauthorized` - "Unauthorized 1"

**Causas posibles:**
1. API key inválida o no existe
2. API key no corresponde al sitio solicitado
3. No se envió API key ni hay sesión activa

**Solución:**
- Verifica que la API key sea correcta (debe empezar con `rb_`)
- Verifica que la API key corresponda al sitio que estás consultando
- Genera una nueva API key si la anterior fue revocada

### Error: `403 Forbidden`

**Causas posibles:**
1. El sitio no existe
2. No tienes permisos para acceder al sitio

**Solución:**
- Verifica que el siteId en la URL sea correcto
- Verifica que la API key corresponda al sitio

### Error: `500 Internal Server Error` - "Auth check failed"

**Causas posibles:**
1. Error interno del servidor al validar autenticación
2. Problema de conexión con la base de datos

**Solución:**
- Revisa los logs del servidor para más detalles
- Verifica que la base de datos esté accesible

### Error: CORS - "No 'Access-Control-Allow-Origin' header"

**Causas posibles:**
1. El header `X-API-Key` no está siendo permitido por CORS

**Solución:**
- Este error ya fue solucionado agregando `X-API-Key` a los headers permitidos
- Si persiste, verifica que el servidor esté actualizado

### Error: API key no se reconoce después de generarla

**Causas posibles:**
1. El cache de configuración de sitios no se ha actualizado

**Solución:**
- Reinicia el servidor para recargar el cache
- O espera a que el cache se actualice automáticamente

---

## Ejemplo de Integración con n8n

### HTTP Request Node

1. **Method:** GET
2. **URL:** `https://tu-rybbit.com/api/overview/1`
3. **Headers:**
   - `X-API-Key`: `rb_tu_api_key`
4. **Query Parameters:**
   - `startDate`: `2024-01-01`
   - `endDate`: `2024-01-31`
   - `timeZone`: `America/Mexico_City`

### Ejemplo de Workflow

```
[Trigger: Schedule] → [HTTP Request: Rybbit API] → [Process Data] → [Send to Slack/Email]
```

---

## Seguridad

- **Solo lectura:** La API key solo permite operaciones GET (lectura de datos)
- **Vinculada a sitio:** Cada API key está asociada a un sitio específico
- **Revocable:** Puedes revocar una API key en cualquier momento desde la configuración
- **HTTPS:** Se recomienda usar HTTPS en producción para proteger la API key en tránsito

---

## Notas Técnicas

- Las API keys tienen el formato `rb_` seguido de 32 caracteres hexadecimales
- El cache de API keys se carga al iniciar el servidor y se actualiza cuando se genera/revoca una key
- La validación de API key es más rápida que la validación de sesión (no requiere consulta a BD)
