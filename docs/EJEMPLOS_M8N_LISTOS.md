# 🎯 Ejemplos de Workflows M8N Listos para Usar

## 1. Campaña Diaria de Re-engagement por Email

**Descripción:** Envía emails a usuarios que abandonaron hace 5-48 horas.

**Configuración en m8n:**

```yaml
name: "Daily Onboarding Re-engagement Email"
description: "Envía emails a usuarios que abandonaron onboarding"
enabled: true

triggers:
  - type: "schedule"
    cron: "0 9 * * *"
    timezone: "America/Mexico_City"

steps:
  - id: "fetch_abandoned"
    name: "Obtener usuarios que abandonaron"
    type: "http"
    config:
      method: "GET"
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      headers:
        X-API-Key: "${env.RYBBIT_API_KEY}"
      params:
        minHoursAgo: "5"
        maxHoursAgo: "48"
        unique_users: "true"
        limit: "500"
    output:
      variable: "abandoned_users"

  - id: "process_users"
    name: "Procesar cada usuario"
    type: "loop"
    config:
      items: "${abandoned_users.data}"
      do:
        - id: "check_email"
          name: "Verificar si tiene email"
          type: "condition"
          config:
            if: "${item.email != null && item.email != ''}"
            then:
              - id: "send_email"
                name: "Enviar email"
                type: "email"
                config:
                  to: "${item.email}"
                  subject: "¡Continúa configurando tu restaurante, ${item.name}!"
                  template: "onboarding_reminder"
                  variables:
                    nombre: "${item.name}"
                    last_step: "${item.last_step_name}"
                    progress: "${item.progress_percentage}"
                    link: "https://app.easyorder.app/onboarding/resume?user_id=${item.user_id}"

              - id: "track_email_sent"
                name: "Registrar envío"
                type: "http"
                config:
                  method: "POST"
                  url: "https://api-rybbit.nexgen.systems/api/track"
                  headers:
                    X-API-Key: "${env.RYBBIT_API_KEY}"
                  body:
                    event_name: "reengagement_email_sent"
                    user_id: "${item.user_id}"
                    properties:
                      step: "${item.last_step_name}"
                      progress: "${item.progress_percentage}"

  - id: "log_summary"
    name: "Registrar resumen"
    type: "log"
    config:
      level: "info"
      message: "Campaign completed: ${abandoned_users.data.length} users processed"
```

---

## 2. Campaña de WhatsApp para Usuarios Específicos

**Descripción:** Envía mensajes WhatsApp a usuarios que abandonaron en paso específico.

**Configuración en m8n:**

```yaml
name: "WhatsApp Abandonment Campaign"
description: "Envía WhatsApp a usuarios que abandonaron en 'Productos'"
enabled: true

triggers:
  - type: "schedule"
    cron: "0 14 * * *"
    timezone: "America/Mexico_City"

steps:
  - id: "fetch_abandoned"
    name: "Obtener abandonos"
    type: "http"
    config:
      method: "GET"
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      headers:
        X-API-Key: "${env.RYBBIT_API_KEY}"
      params:
        minHoursAgo: "5"
        maxHoursAgo: "72"
        unique_users: "true"
        limit: "500"
    output:
      variable: "abandoned_users"

  - id: "filter_and_send"
    name: "Filtrar y enviar"
    type: "loop"
    config:
      items: "${abandoned_users.data}"
      do:
        - id: "check_conditions"
          name: "Verificar condiciones"
          type: "condition"
          config:
            if: "${item.phone != null && item.phone != '' && item.last_step_name == 'Productos'}"
            then:
              - id: "send_whatsapp"
                name: "Enviar WhatsApp"
                type: "whatsapp"
                config:
                  to: "${item.phone}"
                  template: "onboarding_abandonment"
                  variables:
                    nombre: "${item.name}"
                    step: "${item.last_step_name}"
                    progress: "${item.progress_percentage}"
                    link: "https://app.easyorder.app/onboarding/resume?user_id=${item.user_id}"

              - id: "track_whatsapp"
                name: "Registrar envío"
                type: "http"
                config:
                  method: "POST"
                  url: "https://api-rybbit.nexgen.systems/api/track"
                  headers:
                    X-API-Key: "${env.RYBBIT_API_KEY}"
                  body:
                    event_name: "reengagement_whatsapp_sent"
                    user_id: "${item.user_id}"
                    properties:
                      step: "${item.last_step_name}"
                      channel: "whatsapp"
```

---

## 3. Campaña Segmentada por Progreso

**Descripción:** Envía diferentes mensajes según qué tan lejos llegaron en el onboarding.

**Configuración en m8n:**

```yaml
name: "Segmented Onboarding Campaign"
description: "Mensajes personalizados según progreso"
enabled: true

triggers:
  - type: "schedule"
    cron: "0 10 * * *"
    timezone: "America/Mexico_City"

steps:
  - id: "fetch_abandoned"
    name: "Obtener abandonos"
    type: "http"
    config:
      method: "GET"
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      headers:
        X-API-Key: "${env.RYBBIT_API_KEY}"
      params:
        minHoursAgo: "5"
        maxHoursAgo: "72"
        unique_users: "true"
        limit: "1000"
    output:
      variable: "abandoned_users"

  - id: "segment_and_send"
    name: "Segmentar y enviar"
    type: "loop"
    config:
      items: "${abandoned_users.data}"
      do:
        - id: "early_abandonment"
          name: "Abandono temprano (< 25%)"
          type: "condition"
          config:
            if: "${item.email != null && item.progress_percentage < 25}"
            then:
              - id: "send_early"
                name: "Enviar email de ánimo"
                type: "email"
                config:
                  to: "${item.email}"
                  subject: "¡Hola ${item.name}! Necesitamos solo 2 minutos más"
                  template: "early_abandonment"
                  variables:
                    nombre: "${item.name}"
                    message: "Sabemos que estás ocupado, pero solo necesitamos 2 minutos más para terminar la configuración."

        - id: "mid_abandonment"
          name: "Abandono medio (25-50%)"
          type: "condition"
          config:
            if: "${item.email != null && item.progress_percentage >= 25 && item.progress_percentage < 50}"
            then:
              - id: "send_mid"
                name: "Enviar email de progreso"
                type: "email"
                config:
                  to: "${item.email}"
                  subject: "¡Ya estás a mitad del camino, ${item.name}!"
                  template: "mid_abandonment"
                  variables:
                    nombre: "${item.name}"
                    progress: "${item.progress_percentage}"

        - id: "late_abandonment"
          name: "Abandono tardío (50-75%)"
          type: "condition"
          config:
            if: "${item.email != null && item.progress_percentage >= 50 && item.progress_percentage < 75}"
            then:
              - id: "send_late"
                name: "Enviar email casi listo"
                type: "email"
                config:
                  to: "${item.email}"
                  subject: "¡Casi listo, ${item.name}! Solo falta un poco"
                  template: "late_abandonment"
                  variables:
                    nombre: "${item.name}"
                    progress: "${item.progress_percentage}"

        - id: "very_late_abandonment"
          name: "Abandono muy tardío (> 75%)"
          type: "condition"
          config:
            if: "${item.email != null && item.progress_percentage >= 75}"
            then:
              - id: "send_vip"
                name: "Enviar email VIP"
                type: "email"
                config:
                  to: "${item.email}"
                  cc: "support@easyorder.app"
                  subject: "Soporte especial para ${item.name}"
                  template: "vip_support"
                  variables:
                    nombre: "${item.name}"
                    progress: "${item.progress_percentage}"
                    support_link: "https://support.easyorder.app/chat?user_id=${item.user_id}"
```

---

## 4. Campaña Multicanal (Email + WhatsApp)

**Descripción:** Envía por email si está disponible, y por WhatsApp si tiene teléfono.

**Configuración en m8n:**

```yaml
name: "Multichannel Campaign"
description: "Email + WhatsApp según disponibilidad"
enabled: true

triggers:
  - type: "schedule"
    cron: "0 11 * * *"
    timezone: "America/Mexico_City"

steps:
  - id: "fetch_abandoned"
    name: "Obtener abandonos"
    type: "http"
    config:
      method: "GET"
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      headers:
        X-API-Key: "${env.RYBBIT_API_KEY}"
      params:
        minHoursAgo: "5"
        maxHoursAgo: "48"
        unique_users: "true"
        limit: "500"
    output:
      variable: "abandoned_users"

  - id: "process_multichannel"
    name: "Procesar multicanal"
    type: "loop"
    config:
      items: "${abandoned_users.data}"
      do:
        - id: "send_email"
          name: "Enviar email"
          type: "condition"
          config:
            if: "${item.email != null && item.email != ''}"
            then:
              - id: "email_action"
                name: "Email"
                type: "email"
                config:
                  to: "${item.email}"
                  subject: "¡Continúa configurando tu restaurante!"
                  template: "onboarding_reminder"
                  variables:
                    nombre: "${item.name}"
                    step: "${item.last_step_name}"

        - id: "send_whatsapp"
          name: "Enviar WhatsApp"
          type: "condition"
          config:
            if: "${item.phone != null && item.phone != ''}"
            then:
              - id: "whatsapp_action"
                name: "WhatsApp"
                type: "whatsapp"
                config:
                  to: "${item.phone}"
                  template: "onboarding_reminder"
                  variables:
                    nombre: "${item.name}"
                    step: "${item.last_step_name}"

        - id: "track_campaign"
          name: "Registrar contacto"
          type: "http"
          config:
            method: "POST"
            url: "https://api-rybbit.nexgen.systems/api/track"
            headers:
              X-API-Key: "${env.RYBBIT_API_KEY}"
            body:
              event_name: "reengagement_multichannel_sent"
              user_id: "${item.user_id}"
              properties:
                channels: ["email", "whatsapp"]
                step: "${item.last_step_name}"
```

---

## 5. Análisis de Abandonment Rate

**Descripción:** Obtiene estadísticas de abandonos por paso.

**Configuración en m8n:**

```yaml
name: "Abandonment Analysis"
description: "Análisis de abandonos por paso"
enabled: true

triggers:
  - type: "schedule"
    cron: "0 8 * * 1"
    timezone: "America/Mexico_City"

steps:
  - id: "fetch_all_abandonments"
    name: "Obtener todos los abandonos"
    type: "http"
    config:
      method: "GET"
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      headers:
        X-API-Key: "${env.RYBBIT_API_KEY}"
      params:
        startDate: "${new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]}"
        limit: "1000"
    output:
      variable: "all_abandonments"

  - id: "analyze_data"
    name: "Analizar datos"
    type: "script"
    config:
      language: "javascript"
      code: |
        const data = ${all_abandonments.data};
        const byStep = {};
        
        data.forEach(item => {
          const step = item.last_step_name;
          if (!byStep[step]) {
            byStep[step] = { count: 0, avgProgress: 0, users: [] };
          }
          byStep[step].count++;
          byStep[step].avgProgress += item.progress_percentage;
          byStep[step].users.push(item.user_id);
        });
        
        Object.keys(byStep).forEach(step => {
          byStep[step].avgProgress = Math.round(byStep[step].avgProgress / byStep[step].count);
        });
        
        return byStep;
    output:
      variable: "analysis"

  - id: "send_report"
    name: "Enviar reporte"
    type: "email"
    config:
      to: "analytics@easyorder.app"
      subject: "Reporte Semanal de Abandonos"
      template: "abandonment_report"
      variables:
        analysis: "${analysis}"
        total: "${all_abandonments.data.length}"
```

---

## 6. Búsqueda de Usuarios por Email

**Descripción:** Obtiene usuarios de un dominio específico.

**Configuración en m8n:**

```yaml
name: "Search Users by Email Domain"
description: "Obtiene usuarios de un dominio específico"
enabled: true

triggers:
  - type: "manual"
    parameters:
      - name: "domain"
        type: "string"
        description: "Dominio de email (ej: gmail.com)"
        required: true

steps:
  - id: "search_users"
    name: "Buscar usuarios"
    type: "http"
    config:
      method: "GET"
      url: "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2"
      headers:
        X-API-Key: "${env.RYBBIT_API_KEY}"
      params:
        email: "${trigger.domain}"
        limit: "500"
    output:
      variable: "users"

  - id: "process_results"
    name: "Procesar resultados"
    type: "log"
    config:
      level: "info"
      message: "Found ${users.data.length} users with domain ${trigger.domain}"

  - id: "export_csv"
    name: "Exportar a CSV"
    type: "file"
    config:
      format: "csv"
      data: "${users.data}"
      filename: "usuarios_${trigger.domain}_${new Date().toISOString().split('T')[0]}.csv"
```

---

## 7. Sincronización Diaria de Datos

**Descripción:** Sincroniza datos de abandonos a una base de datos externa.

**Configuración en m8n:**

```yaml
name: "Daily Data Sync"
description: "Sincroniza abandonos a base de datos"
enabled: true

triggers:
  - type: "schedule"
    cron: "0 2 * * *"
    timezone: "America/Mexico_City"

steps:
  - id: "fetch_data"
    name: "Obtener datos"
    type: "http"
    config:
      method: "GET"
      url: "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2"
      headers:
        X-API-Key: "${env.RYBBIT_API_KEY}"
      params:
        startDate: "${new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]}"
        unique_users: "true"
        limit: "1000"
    output:
      variable: "abandonments"

  - id: "sync_to_database"
    name: "Sincronizar a BD"
    type: "database"
    config:
      connection: "${env.DATABASE_URL}"
      query: |
        INSERT INTO abandonment_logs (user_id, email, phone, name, step, progress, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      data: "${abandonments.data}"
      onDuplicate: "UPDATE"

  - id: "log_sync"
    name: "Registrar sincronización"
    type: "log"
    config:
      level: "info"
      message: "Synced ${abandonments.data.length} records"
```

---

## Configuración Requerida en m8n

### Variables de Entorno

```env
RYBBIT_API_KEY=rb_your_api_key_here
RYBBIT_SITE_ID=2
DATABASE_URL=postgresql://user:pass@host/db
```

### Templates de Email Recomendados

Crear en m8n los siguientes templates:

- `onboarding_reminder` - Recordatorio general
- `early_abandonment` - Para usuarios que abandonaron temprano
- `mid_abandonment` - Para usuarios a mitad del camino
- `late_abandonment` - Para usuarios casi al final
- `vip_support` - Para usuarios muy avanzados
- `abandonment_report` - Reporte semanal

### Templates de WhatsApp Recomendados

- `onboarding_reminder` - Recordatorio general
- `onboarding_abandonment` - Mensaje de abandono

---

## Tips de Implementación

1. **Comienza con campaña simple** - Usa el ejemplo 1 primero
2. **Prueba con pequeño volumen** - Usa `limit=10` para testing
3. **Monitorea métricas** - Registra eventos con `track` endpoint
4. **Ajusta horarios** - Usa zona horaria del usuario
5. **Personaliza mensajes** - Usa variables disponibles
6. **Combina canales** - Email + WhatsApp para mayor alcance
7. **Segmenta usuarios** - Diferentes mensajes por progreso

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| No se envían mensajes | Verificar API Key y que users tengan email/phone |
| Usuarios duplicados | Usar `unique_users=true` |
| Spam a usuarios recientes | Usar `minHoursAgo=5` |
| Datos incompletos | Verificar que email/phone no sean null |
| Rate limiting | Reducir `limit` o aumentar intervalo |

---

## Documentación Relacionada

- `GUIA_COMPLETA_ENDPOINTS_M8N.md` - Guía detallada
- `REFERENCIA_RAPIDA_ENDPOINTS.md` - Referencia rápida
- `ABANDONMENT_DATA_ENDPOINT.md` - Detalles técnicos
