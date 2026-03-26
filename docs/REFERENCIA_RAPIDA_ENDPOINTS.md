# 🚀 Referencia Rápida - Endpoints Rybbit

## Endpoints Disponibles

### 1️⃣ Obtener Perfiles de Usuario
```
GET /api/analytics/user-profiles/:site
```
**Para:** Obtener lista de usuarios con filtros de email/phone

**Filtros principales:**
- `hasEmail=true` - Solo usuarios con email
- `hasPhone=true` - Solo usuarios con teléfono
- `hasContact=true` - Usuarios con email O teléfono
- `email=gmail` - Búsqueda por dominio
- `search=juan` - Búsqueda general

**Ejemplo:**
```bash
curl -H "X-API-Key: API_KEY" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?hasContact=true&limit=500"
```

---

### 2️⃣ Obtener Abandonos de Onboarding
```
GET /api/analytics/abandonment-data/:site
```
**Para:** Obtener usuarios que abandonaron con filtros de tiempo

**Filtros principales:**
- `unique_users=true` - Un registro por usuario
- `minHoursAgo=5` - Solo eventos con más de 5 horas
- `maxHoursAgo=48` - Solo eventos de últimas 48 horas
- `startDate=2026-02-01` - Fecha inicio
- `endDate=2026-03-20` - Fecha fin

**Ejemplo:**
```bash
curl -H "X-API-Key: API_KEY" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?minHoursAgo=5&maxHoursAgo=48&unique_users=true"
```

---

### 3️⃣ Obtener Perfil Individual
```
GET /api/analytics/user/:userId/:site
```
**Para:** Obtener datos de contacto de un usuario específico

**Ejemplo:**
```bash
curl -H "X-API-Key: API_KEY" \
  "https://api-rybbit.nexgen.systems/api/analytics/user/442/2"
```

---

### 4️⃣ Exportar a CSV
```
GET /api/analytics/export-csv/:site
```
**Para:** Descargar datos a CSV

**Filtros:**
- `includeUserProfiles=true` - Incluir email/phone

**Ejemplo:**
```bash
curl -H "X-API-Key: API_KEY" \
  "https://api-rybbit.nexgen.systems/api/analytics/export-csv/2?includeUserProfiles=true" \
  -o usuarios.csv
```

---

## Filtros Disponibles

### Filtros de Contacto
| Filtro | Uso |
|--------|-----|
| `hasEmail=true` | Solo con email |
| `hasPhone=true` | Solo con teléfono |
| `hasContact=true` | Con email O teléfono |
| `email=dominio` | Búsqueda por dominio |
| `phone=prefijo` | Búsqueda por prefijo |
| `search=texto` | Búsqueda general |

### Filtros de Tiempo
| Filtro | Uso |
|--------|-----|
| `minHoursAgo=5` | Más de 5 horas atrás |
| `maxHoursAgo=48` | Últimas 48 horas |
| `startDate=YYYY-MM-DD` | Desde fecha |
| `endDate=YYYY-MM-DD` | Hasta fecha |
| `timeZone=America/Mexico_City` | Zona horaria |

### Filtros de Paginación
| Filtro | Uso |
|--------|-----|
| `limit=500` | Máximo 1000 |
| `offset=100` | Saltar registros |
| `unique_users=true` | Un registro por usuario |

---

## Casos de Uso Rápidos

### 📧 Campaña de Email
```bash
# Obtener usuarios con email que abandonaron hace 5-48 horas
curl -H "X-API-Key: API_KEY" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?minHoursAgo=5&maxHoursAgo=48&unique_users=true&limit=500"
```

### 💬 Campaña de WhatsApp
```bash
# Obtener usuarios con teléfono que abandonaron
curl -H "X-API-Key: API_KEY" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?minHoursAgo=5&unique_users=true&limit=500"
```

### 🔍 Buscar por Email
```bash
# Obtener usuarios de Gmail
curl -H "X-API-Key: API_KEY" \
  "https://api-rybbit.nexgen.systems/api/analytics/user-profiles/2?email=gmail&limit=500"
```

### 📊 Análisis Completo
```bash
# Obtener todos los abandonos con datos de contacto
curl -H "X-API-Key: API_KEY" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?unique_users=true&limit=1000"
```

---

## Variables en Respuesta

### Desde abandonment-data
```
${user_id}              - ID del usuario
${email}                - Email del usuario
${phone}                - Teléfono del usuario
${name}                 - Nombre del usuario
${last_step_name}       - Paso donde abandonó
${last_step_number}     - Número del paso
${progress_percentage}  - Porcentaje completado
${abandoned_at}         - Fecha del abandono
${duration_ms}          - Tiempo en onboarding
${abandonment_count}    - Veces que abandonó
```

### Desde user-profiles
```
${user_id}              - ID del usuario
${email}                - Email del usuario
${phone}                - Teléfono del usuario
${name}                 - Nombre del usuario
${created_at}           - Fecha de creación
${updated_at}           - Última actualización
```

---

## Estructura de Respuesta

### Abandonment Data
```json
{
  "data": [
    {
      "user_id": "442",
      "email": "juan@gmail.com",
      "phone": "+5216871234567",
      "name": "Juan Pérez",
      "last_step_name": "Productos",
      "progress_percentage": 45,
      "abandoned_at": "2026-03-20T10:50:00Z"
    }
  ],
  "pagination": {
    "total": 145,
    "limit": 100,
    "offset": 0
  },
  "meta": {
    "time_filters": {
      "minHoursAgo": 5,
      "maxHoursAgo": 48
    }
  }
}
```

### User Profiles
```json
{
  "success": true,
  "data": [
    {
      "user_id": "442",
      "email": "juan@gmail.com",
      "phone": "+5216871234567",
      "name": "Juan Pérez"
    }
  ],
  "pagination": {
    "total": 245,
    "limit": 100,
    "offset": 0
  }
}
```

---

## Combinaciones de Filtros Útiles

### Para m8n - Campaña Diaria
```
minHoursAgo=5
maxHoursAgo=72
unique_users=true
limit=500
```

### Para m8n - Campaña Semanal
```
startDate=2026-03-13
endDate=2026-03-20
unique_users=true
limit=1000
```

### Para m8n - Segmentación por Progreso
```
unique_users=true
limit=1000
# Luego filtrar en m8n por progress_percentage
```

### Para m8n - Multicanal
```
hasContact=true
limit=500
# Luego enviar por email o WhatsApp según disponibilidad
```

---

## Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| 403 Unauthorized | API Key inválida | Verificar API Key |
| 400 Bad Request | Parámetros inválidos | Revisar sintaxis |
| 404 Not Found | Site ID no existe | Verificar site ID |
| 500 Server Error | Error interno | Reintentar o contactar soporte |

---

## Tips para m8n

1. **Usar `unique_users=true`** para evitar duplicados
2. **Usar `minHoursAgo=5`** para no spamear usuarios recientes
3. **Usar `maxHoursAgo=72`** para no contactar muy antiguos
4. **Usar `limit=500-1000`** para procesar en lotes
5. **Combinar filtros** para segmentación precisa
6. **Verificar `email` y `phone`** antes de enviar

---

## Autenticación

```bash
# Opción 1: Header
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/..."

# Opción 2: Query Parameter
curl "https://api-rybbit.nexgen.systems/api/analytics/...?api_key=rb_your_api_key"
```

---

## Documentación Completa

Para más detalles, ver:
- `GUIA_COMPLETA_ENDPOINTS_M8N.md` - Guía completa con ejemplos
- `ABANDONMENT_DATA_ENDPOINT.md` - Detalles de abandonment
- `RYBBIT_FILTRADO_EMAIL_PHONE.md` - Detalles de user-profiles
