# 📚 Guía Completa de Endpoints Rybbit para m8n

## Índice

1. [Endpoints Disponibles](#endpoints-disponibles)
2. [Filtros por Endpoint](#filtros-por-endpoint)
3. [Ejemplos Prácticos para m8n](#ejemplos-prácticos-para-m8n)
4. [Casos de Uso Comunes](#casos-de-uso-comunes)
5. [Integración con m8n](#integración-con-m8n)

---

## Endpoints Disponibles

### 1. Obtener Perfiles de Usuario con Filtros
**GET** `/api/analytics/user-profiles/:site`

Obtiene lista de usuarios identificados con soporte para filtrado por email/phone.

#### Parámetros

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `hasEmail` | string | `"true"` para obtener solo usuarios con email | `hasEmail=true` |
| `hasPhone` | string | `"true"` para obtener solo usuarios con teléfono | `hasPhone=true` |
| `hasContact` | string | `"true"` para obtener usuarios con email **O** phone (al menos uno) | `hasContact=true` |
| `email` | string | Búsqueda parcial de email | `email=gmail` |
| `phone` | string | Búsqueda parcial de teléfono | `phone=55` |
| `search` | string | Búsqueda en email, phone o nombre | `search=juan` |
| `limit` | string | Máximo de resultados (default: 100, max: 1000) | `limit=500` |
| `offset` | string | Offset para paginación | `offset=100` |

#### Ejemplos de Uso

**Obtener todos los usuarios con email:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?hasEmail=true&limit=100"
```

**Obtener usuarios con email O teléfono:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?hasContact=true&limit=500"
```

**Buscar usuarios por dominio de email:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?email=gmail&limit=100"
```

**Buscar usuarios por nombre:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?search=juan&limit=100"
```

#### Respuesta

```json
{
  "success": true,
  "data": [
    {
      "user_id": "442",
      "email": "juan.perez@gmail.com",
      "phone": "+5216871234567",
      "name": "Juan Pérez",
      "created_at": "2026-02-15T10:50:00Z",
      "updated_at": "2026-03-20T14:30:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 245
  },
  "filters": {
    "hasEmail": true,
    "hasPhone": false,
    "hasContact": false,
    "email": null,
    "phone": null,
    "search": null
  }
}
```

---

### 2. Obtener Datos de Abandono de Onboarding
**GET** `/api/analytics/abandonment-data/:site`

Obtiene usuarios que abandonaron el onboarding con filtros de tiempo.

#### Parámetros

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `user_id` | string | ID del usuario específico | `user_id=442` |
| `startDate` | string | Fecha inicio (YYYY-MM-DD) | `startDate=2026-02-01` |
| `endDate` | string | Fecha fin (YYYY-MM-DD) | `endDate=2026-03-20` |
| `unique_users` | string | `"true"` para un registro por usuario | `unique_users=true` |
| `minHoursAgo` | float | Solo eventos con más de X horas | `minHoursAgo=5` |
| `maxHoursAgo` | float | Solo eventos de las últimas X horas | `maxHoursAgo=48` |
| `timeZone` | string | Zona horaria para referencia | `timeZone=America/Mexico_City` |
| `limit` | string | Máximo de resultados (default: 100, max: 1000) | `limit=500` |
| `offset` | string | Offset para paginación | `offset=0` |

#### Ejemplos de Uso

**Obtener usuarios únicos que abandonaron (recomendado para m8n):**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?unique_users=true&limit=100"
```

**Obtener solo eventos con más de 5 horas de antigüedad (evitar spam):**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?minHoursAgo=5&unique_users=true&limit=100"
```

**Ventana de tiempo: entre 5 y 48 horas atrás:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?minHoursAgo=5&maxHoursAgo=48&unique_users=true&limit=100"
```

**Obtener abandonos en rango de fechas:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?startDate=2026-02-01&endDate=2026-03-20&unique_users=true&limit=100"
```

**Obtener abandono específico del usuario 442:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?user_id=442"
```

#### Respuesta

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
      "progress_percentage": 18,
      "abandonment_count": 3
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
    "filtered_by_user": false,
    "date_range": null,
    "time_filters": {
      "minHoursAgo": 5,
      "maxHoursAgo": 48,
      "timeZone": "America/Mexico_City"
    }
  }
}
```

---

### 3. Obtener Perfil de Usuario Individual
**GET** `/api/analytics/user/:userId/:site`

Obtiene datos de contacto de un usuario específico.

#### Parámetros

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `userId` | string | ID del usuario |
| `site` | string | ID del sitio |

#### Ejemplo de Uso

```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user/442/2"
```

#### Respuesta

```json
{
  "success": true,
  "data": {
    "user_id": "442",
    "email": "juan.perez@gmail.com",
    "phone": "+5216871234567",
    "name": "Juan Pérez",
    "created_at": "2026-02-15T10:50:00Z",
    "updated_at": "2026-03-20T14:30:00Z"
  }
}
```

---

### 4. Exportar CSV con Email/Phone
**GET** `/api/analytics/export-csv/:site`

Exporta datos de usuarios a CSV con opción de incluir perfiles.

#### Parámetros

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `includeUserProfiles` | string | `"true"` para incluir email/phone | `includeUserProfiles=true` |
| `startDate` | string | Fecha inicio (YYYY-MM-DD) | `startDate=2026-02-01` |
| `endDate` | string | Fecha fin (YYYY-MM-DD) | `endDate=2026-03-20` |

#### Ejemplo de Uso

```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/export-csv/2?includeUserProfiles=true" \
  -o usuarios.csv
```

---

## Filtros por Endpoint

### Filtros de Contacto (user-profiles)

| Filtro | Propósito | Caso de Uso |
|--------|-----------|------------|
| `hasEmail=true` | Solo usuarios con email | Campañas por email |
| `hasPhone=true` | Solo usuarios con teléfono | Campañas por WhatsApp/SMS |
| `hasContact=true` | Usuarios con email O teléfono | Campañas multicanal |
| `email=dominio` | Búsqueda por dominio | Filtrar por empresa (ej: @gmail.com) |
| `phone=prefijo` | Búsqueda por prefijo | Filtrar por país/región |
| `search=texto` | Búsqueda general | Buscar por nombre, email o teléfono |

### Filtros de Tiempo (abandonment-data)

| Filtro | Propósito | Caso de Uso |
|--------|-----------|------------|
| `minHoursAgo=5` | Eventos con más de 5 horas | Evitar spam a usuarios recientes |
| `maxHoursAgo=48` | Eventos de las últimas 48 horas | Limitar ventana de tiempo |
| `minHoursAgo=5&maxHoursAgo=48` | Ventana específica | Campañas diarias sin repetir |
| `timeZone=America/Mexico_City` | Zona horaria | Referencia para logs/metadata |

### Filtros de Rango (ambos endpoints)

| Filtro | Propósito | Caso de Uso |
|--------|-----------|------------|
| `startDate=YYYY-MM-DD` | Fecha inicio | Análisis histórico |
| `endDate=YYYY-MM-DD` | Fecha fin | Análisis histórico |
| `limit=500` | Máximo de resultados | Paginación |
| `offset=100` | Saltar registros | Paginación |

---

## Ejemplos Prácticos para m8n

### Ejemplo 1: Campaña de Re-engagement por Email

**Objetivo:** Contactar usuarios que abandonaron hace más de 5 horas pero menos de 48 horas.

```bash
# 1. Obtener usuarios que cumplen criterios
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?minHoursAgo=5&maxHoursAgo=48&unique_users=true&limit=500"

# Respuesta contiene:
# - email: para enviar correo
# - name: para personalizar mensaje
# - last_step_name: para contexto
# - progress_percentage: para urgencia
```

**Workflow en m8n:**
```yaml
name: Onboarding Abandonment Email Campaign
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
      params:
        minHoursAgo: 5
        maxHoursAgo: 48
        unique_users: "true"
        limit: 500

  - name: Send Email
    type: email
    config:
      to: "${email}"
      subject: "¡Continúa configurando tu restaurante, ${name}!"
      template: "onboarding_reminder"
      variables:
        nombre: "${name}"
        last_step: "${last_step_name}"
        progress: "${progress_percentage}"
        link: "https://app.easyorder.app/onboarding/resume?user_id=${user_id}"
```

---

### Ejemplo 2: Campaña de Re-engagement por WhatsApp

**Objetivo:** Contactar usuarios con teléfono que abandonaron en paso específico.

```bash
# 1. Obtener usuarios con teléfono que abandonaron
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?minHoursAgo=5&unique_users=true&limit=500"

# Filtrar en m8n por: last_step_name == "Productos" y phone != null
```

**Workflow en m8n:**
```yaml
name: Onboarding Abandonment WhatsApp Campaign
triggers:
  - type: schedule
    cron: "0 14 * * *"  # Diariamente a las 2 PM

actions:
  - name: Get Abandoned Users
    type: http
    config:
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      method: GET
      headers:
        X-API-Key: "${RYBBIT_API_KEY}"
      params:
        minHoursAgo: 5
        maxHoursAgo: 72
        unique_users: "true"
        limit: 500

  - name: Filter Users with Phone
    type: filter
    config:
      condition: "phone != null && last_step_name == 'Productos'"

  - name: Send WhatsApp Message
    type: whatsapp
    config:
      to: "${phone}"
      template: "onboarding_abandonment_reengagement"
      variables:
        nombre: "${name}"
        last_step: "${last_step_name}"
        progress: "${progress_percentage}"
        link: "https://app.easyorder.app/onboarding/resume?user_id=${user_id}&step=${last_step_number}"

  - name: Track Campaign
    type: http
    config:
      url: "https://api-rybbit.nexgen.systems/api/track"
      method: POST
      body:
        event_name: "reengagement_whatsapp_sent"
        user_id: "${user_id}"
        properties:
          abandonment_step: "${last_step_name}"
          progress_percentage: "${progress_percentage}"
```

---

### Ejemplo 3: Segmentación por Progreso

**Objetivo:** Enviar diferentes mensajes según qué tan lejos llegaron.

```bash
# Obtener todos los abandonos
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?minHoursAgo=5&unique_users=true&limit=1000"
```

**Workflow en m8n con segmentación:**
```yaml
name: Segmented Onboarding Re-engagement
triggers:
  - type: schedule
    cron: "0 10 * * *"

actions:
  - name: Get Abandoned Users
    type: http
    config:
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      method: GET
      headers:
        X-API-Key: "${RYBBIT_API_KEY}"
      params:
        minHoursAgo: 5
        maxHoursAgo: 72
        unique_users: "true"
        limit: 1000

  - name: Early Abandonment (< 25%)
    type: filter
    config:
      condition: "progress_percentage < 25"
    then:
      - name: Send Encouragement Email
        type: email
        config:
          to: "${email}"
          subject: "¡Hola ${name}! Necesitamos solo 2 minutos más"
          template: "early_abandonment"

  - name: Mid Abandonment (25-50%)
    type: filter
    config:
      condition: "progress_percentage >= 25 && progress_percentage < 50"
    then:
      - name: Send Progress Email
        type: email
        config:
          to: "${email}"
          subject: "¡Ya estás a mitad del camino, ${name}!"
          template: "mid_abandonment"

  - name: Late Abandonment (50-75%)
    type: filter
    config:
      condition: "progress_percentage >= 50 && progress_percentage < 75"
    then:
      - name: Send Almost Done Email
        type: email
        config:
          to: "${email}"
          subject: "¡Casi listo, ${name}! Solo falta un poco"
          template: "late_abandonment"

  - name: Very Late Abandonment (> 75%)
    type: filter
    config:
      condition: "progress_percentage >= 75"
    then:
      - name: Send VIP Support Email
        type: email
        config:
          to: "${email}"
          subject: "Soporte especial para ${name}"
          template: "vip_support"
          cc: "support@easyorder.app"
```

---

### Ejemplo 4: Búsqueda de Usuarios por Email

**Objetivo:** Obtener todos los usuarios de un dominio específico.

```bash
# Obtener todos los usuarios con email de Gmail
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?email=gmail&limit=500"

# Obtener todos los usuarios con email de empresa
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?email=empresa.com&limit=500"
```

---

### Ejemplo 5: Exportar Datos para Análisis

**Objetivo:** Exportar todos los usuarios con contacto a CSV.

```bash
# Descargar CSV con email y teléfono
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/export-csv/2?includeUserProfiles=true" \
  -o usuarios_contacto.csv
```

---

## Casos de Uso Comunes

### 1. Campaña Diaria de Re-engagement

**Requisitos:**
- Usuarios únicos que abandonaron
- Evitar contactar usuarios recientes (< 5 horas)
- Limitar a últimas 72 horas para no contactar muy antiguos

**Consulta:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?minHoursAgo=5&maxHoursAgo=72&unique_users=true&limit=500"
```

---

### 2. Análisis de Abandonment por Paso

**Requisitos:**
- Todos los abandonos (no solo únicos)
- Agrupar por paso
- Contar frecuencia

**Consulta:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?limit=1000" | \
  jq '.data | group_by(.last_step_name) | map({step: .[0].last_step_name, count: length})'
```

---

### 3. Segmentación por Contacto

**Requisitos:**
- Usuarios con email para campañas por email
- Usuarios con teléfono para campañas por WhatsApp
- Usuarios con ambos para campañas multicanal

**Consultas:**
```bash
# Solo email
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?hasEmail=true&limit=500"

# Solo teléfono
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?hasPhone=true&limit=500"

# Email O teléfono
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?hasContact=true&limit=500"
```

---

### 4. Búsqueda de Usuario Específico

**Requisitos:**
- Obtener datos de contacto de un usuario
- Verificar si tiene email/teléfono

**Consulta:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/user/442/2"
```

---

## Integración con m8n

### Configuración Básica

1. **Obtener API Key de Rybbit**
   - Contactar a soporte para generar API Key
   - Guardar como variable de entorno: `RYBBIT_API_KEY`

2. **Crear Workflow en m8n**
   - Usar trigger de schedule (cron)
   - Llamar endpoint HTTP de Rybbit
   - Procesar datos y enviar mensajes

3. **Variables Disponibles**
   - `${user_id}` - ID del usuario
   - `${email}` - Email del usuario
   - `${phone}` - Teléfono del usuario
   - `${name}` - Nombre del usuario
   - `${last_step_name}` - Paso donde abandonó
   - `${progress_percentage}` - Porcentaje de progreso
   - `${abandoned_at}` - Fecha del abandono

### Ejemplo Completo de Workflow

```yaml
name: Complete Onboarding Re-engagement System
description: Sistema completo de re-engagement para abandonos de onboarding

triggers:
  - type: schedule
    cron: "0 9,14,18 * * *"  # 3 veces al día

actions:
  # 1. Obtener datos
  - name: Fetch Abandoned Users
    type: http
    config:
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      method: GET
      headers:
        X-API-Key: "${RYBBIT_API_KEY}"
      params:
        minHoursAgo: 5
        maxHoursAgo: 72
        unique_users: "true"
        limit: 500
    output: abandoned_users

  # 2. Procesar cada usuario
  - name: Process Users
    type: loop
    config:
      items: "${abandoned_users.data}"
      do:
        # 2a. Filtrar por contacto disponible
        - name: Check Contact
          type: condition
          config:
            if: "${item.email != null || item.phone != null}"
            then:
              # 2b. Enviar por email si disponible
              - name: Send Email
                type: email
                config:
                  to: "${item.email}"
                  subject: "¡Continúa configurando tu restaurante, ${item.name}!"
                  template: "onboarding_reminder_${Math.floor(item.progress_percentage / 25)}"
                  variables:
                    nombre: "${item.name}"
                    last_step: "${item.last_step_name}"
                    progress: "${item.progress_percentage}"
                    link: "https://app.easyorder.app/onboarding/resume?user_id=${item.user_id}"

              # 2c. Enviar por WhatsApp si disponible
              - name: Send WhatsApp
                type: condition
                config:
                  if: "${item.phone != null}"
                  then:
                    - name: Send WhatsApp Message
                      type: whatsapp
                      config:
                        to: "${item.phone}"
                        template: "onboarding_reminder"
                        variables:
                          nombre: "${item.name}"
                          progress: "${item.progress_percentage}"

              # 2d. Registrar evento
              - name: Track Reengagement
                type: http
                config:
                  url: "https://api-rybbit.nexgen.systems/api/track"
                  method: POST
                  body:
                    event_name: "reengagement_campaign_sent"
                    user_id: "${item.user_id}"
                    properties:
                      step: "${item.last_step_name}"
                      progress: "${item.progress_percentage}"
                      channels: ["email", "whatsapp"]
                      timestamp: "${new Date().toISOString()}"

  # 3. Registrar resumen
  - name: Log Summary
    type: log
    config:
      message: "Campaign completed: ${abandoned_users.data.length} users contacted"
```

---

## Notas Importantes

1. **Autenticación:** Todos los endpoints requieren API Key válida
2. **Rate Limiting:** Máximo 1000 registros por request
3. **Paginación:** Usar `limit` y `offset` para grandes volúmenes
4. **Zona Horaria:** Los timestamps están en UTC, usar `timeZone` para referencia
5. **Filtros Combinables:** Puedes combinar múltiples filtros en una sola consulta
6. **Datos de Contacto:** Email y teléfono pueden ser `null` si no están disponibles

---

## Soporte

Para preguntas o problemas:
- Contactar a soporte@rybbit.io
- Documentación: https://docs.rybbit.io
- API Reference: https://api-docs.rybbit.io
