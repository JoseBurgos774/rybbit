# Rybbit Analytics - Filtrado por Email/Phone

## 📋 Resumen Ejecutivo

**Pregunta:** ¿Se puede filtrar usuarios por email o phone en la API de Rybbit?

**Respuesta:** **SÍ, es posible**, pero con ciertas consideraciones:

| Funcionalidad | Estado | Endpoint |
|--------------|--------|----------|
| Obtener perfiles con email/phone | ✅ Disponible | `GET /api/analytics/user-profiles/:site` |
| **Filtrar por email/phone** | ✅ **IMPLEMENTADO** | `GET /api/analytics/user-profiles/:site?hasContact=true` |
| Obtener datos de contacto de un usuario | ✅ Disponible | `GET /api/analytics/user/:userId/:site` |
| Identificar usuarios con email/phone | ✅ Disponible | `POST /api/identify` |
| Filtrar lista de usuarios por email/phone | ✅ **IMPLEMENTADO** | Ver parámetros abajo |
| Exportar CSV con email/phone | ✅ Disponible | `GET /api/analytics/export-csv/:site?includeUserProfiles=true` |

---

## 🏗️ Arquitectura Actual

### Base de Datos

El sistema almacena perfiles de usuario en PostgreSQL:

```sql
-- Tabla: tracked_user_profiles
CREATE TABLE tracked_user_profiles (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,        -- ID del usuario en EasyOrder
  email TEXT,                   -- Email del usuario
  phone TEXT,                   -- Teléfono del usuario
  name TEXT,                    -- Nombre del usuario
  traits JSONB,                 -- Propiedades adicionales
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(site_id, user_id)
);
```

### Flujo de Datos

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Frontend Admin     │────▶│  POST /api/      │────▶│  tracked_user_      │
│  (login exitoso)    │     │  identify        │     │  profiles (PG)      │
└─────────────────────┘     └──────────────────┘     └─────────────────────┘
         │
         │ window.rybbit.identify()
         ▼
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Eventos de         │────▶│  ClickHouse      │────▶│  events (CH)        │
│  tracking           │     │                  │     │  (user_id, etc)     │
└─────────────────────┘     └──────────────────┘     └─────────────────────┘
```

---

## 📡 Endpoints Disponibles

### 1. Identificar Usuario (POST /api/identify)

Almacena email/phone cuando el usuario hace login.

**Request:**
```json
{
  "site_id": "1",
  "user_id": "123",
  "email": "usuario@ejemplo.com",
  "phone": "+52 55 1234 5678",
  "name": "Juan Pérez",
  "traits": {
    "plan_key": "pro",
    "restaurante_id": 456
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

### 2. Obtener Perfiles de Usuario con Filtros (GET /api/analytics/user-profiles/:site)

Lista usuarios identificados con soporte para **filtrado por email/phone**.

#### Parámetros de Filtrado Disponibles

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `hasEmail` | string | `"true"` para obtener solo usuarios con email |
| `hasPhone` | string | `"true"` para obtener solo usuarios con teléfono |
| `hasContact` | string | `"true"` para obtener usuarios con email **O** phone (al menos uno) |
| `email` | string | Búsqueda parcial de email (ej: `"gmail"` encuentra `"user@gmail.com"`) |
| `phone` | string | Búsqueda parcial de teléfono (ej: `"55"` encuentra `"+52 55 1234"`) |
| `search` | string | Búsqueda en email, phone o nombre |
| `limit` | string | Máximo de resultados (default: 100, max: 1000) |
| `offset` | string | Offset para paginación |

#### Ejemplos de Uso

**Obtener usuarios que tengan al menos email O phone:**
```
GET /api/analytics/user-profiles/1?hasContact=true
```

**Obtener solo usuarios con email:**
```
GET /api/analytics/user-profiles/1?hasEmail=true
```

**Buscar por email parcial:**
```
GET /api/analytics/user-profiles/1?email=gmail.com
```

**Buscar por teléfono parcial:**
```
GET /api/analytics/user-profiles/1?phone=55
```

**Búsqueda general (email, phone o nombre):**
```
GET /api/analytics/user-profiles/1?search=juan
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "123",
      "email": "usuario@ejemplo.com",
      "phone": "+52 55 1234 5678",
      "name": "Juan Pérez",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 1
  },
  "filters": {
    "hasEmail": false,
    "hasPhone": false,
    "hasContact": true,
    "email": null,
    "phone": null,
    "search": null
  }
}
```

### 3. Obtener Datos de Contacto de Usuario (GET /api/analytics/user/:userId/:site)

Obtiene email/phone de un usuario específico.

**Request:**
```
GET /api/analytics/user/123/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "123",
    "email": "usuario@ejemplo.com",
    "phone": "+52 55 1234 5678",
    "name": "Juan Pérez",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "source": "rybbit"
}
```

### 4. Exportar CSV con Perfiles (GET /api/analytics/export-csv/:site)

Exporta datos de analytics incluyendo email/phone.

**Request:**
```
GET /api/analytics/export-csv/1?includeUserProfiles=true&startDate=2024-01-01&endDate=2024-01-31
```

---

## ⚠️ Lo que NO está implementado (pero se puede agregar)

### Filtrar usuarios por email/phone en el endpoint `/api/users/:site`

Actualmente el endpoint `getUsers` no soporta filtrar por email o phone porque:

1. Los datos de analytics están en **ClickHouse** (eventos, pageviews, sessions)
2. Los datos de contacto están en **PostgreSQL** (email, phone, name)
3. El endpoint actual solo consulta ClickHouse

### Solución Propuesta

Agregar un nuevo endpoint o modificar el existente para hacer un JOIN entre ambas fuentes:

```typescript
// Nuevo endpoint propuesto
GET /api/analytics/users-with-contact/:site?email=usuario@ejemplo.com
GET /api/analytics/users-with-contact/:site?phone=+52551234
GET /api/analytics/users-with-contact/:site?hasEmail=true
GET /api/analytics/users-with-contact/:site?hasPhone=true
```

---

## 📊 Eventos Implementados

### Panel Admin (web-easyorder-app-administracion)

| Evento | Descripción | Incluye email/phone |
|--------|-------------|---------------------|
| `login_completed` | Login exitoso | ✅ Vía identify() |
| `signup_completed` | Registro completado | ✅ Vía identify() |
| `trial_started` | Inicio de trial | ❌ |
| `onboarding_started` | Inicio onboarding | ❌ |
| `onboarding_completed` | Fin onboarding | ❌ |
| `feature_used` | Uso de funcionalidad | ❌ |
| `order_completed` | Pedido completado | ❌ |
| `close_day_completed` | Corte de caja | ❌ |
| `upgrade_started` | Inicio upgrade | ❌ |
| `upgrade_completed` | Upgrade exitoso | ❌ |

### Landing Page (easyorder-landing-page)

| Evento | Descripción | Incluye email/phone |
|--------|-------------|---------------------|
| `signup_started` | Click en CTA | ❌ |
| `signup_completed` | Registro completado | ❌ (no hay identify) |
| `email_submitted` | Email enviado | ⚠️ Solo dominio |
| `landing_section_viewed` | Sección vista | ❌ |
| `scroll_depth_reached` | Scroll alcanzado | ❌ |

---

## 🔧 Cómo se Captura el Email/Phone Actualmente

### En el Panel Admin

El archivo `identity-manager.ts` captura email/phone al hacer login:

```typescript
// Cuando el usuario hace login exitoso
identityManager.setAuthenticatedUser({
  id: user.id,
  email: user.correo_electronico,
  phone: user.telefono,
  nombre: user.nombre,
  rol_id: user.rol_id,
  restaurante_id: user.restaurante_id,
  plan_key: user.plan_key,
});
```

Esto automáticamente:
1. Llama a `window.rybbit.identify()` con los traits
2. Envía POST a `/api/identify` para guardar en PostgreSQL

---

## 📝 Respuesta a la Pregunta del Chat

> "¿La API puede filtrar dos campos? Por ejemplo: que un usuario me traiga mínimo un dato de uno de los campos de email o phone"

### Respuesta Técnica

**Sí, pero requiere implementación adicional.** Actualmente puedes:

1. **Obtener todos los perfiles** con `GET /api/analytics/user-profiles/:site` y filtrar en el frontend
2. **Buscar un usuario específico** con `GET /api/analytics/user/:userId/:site`
3. **Exportar CSV** con `includeUserProfiles=true` y filtrar en Excel

### Por qué algunos usuarios tienen email y otros no

La observación de que "algunos traen email y otros no" se debe a:

1. **Usuarios con Google OAuth**: El email viene automáticamente del token de Google
2. **Usuarios con registro manual**: Depende de si completaron el campo de email
3. **Usuarios legacy**: Pueden no tener email si se registraron antes de implementar el tracking

### Solución Recomendada

Para filtrar usuarios que tengan al menos email O phone:

```sql
-- Query en PostgreSQL
SELECT * FROM tracked_user_profiles
WHERE site_id = :siteId
  AND (email IS NOT NULL OR phone IS NOT NULL);
```

---

## 🚀 Próximos Pasos (Si se requiere)

1. **Implementar filtrado en API**: Agregar parámetros `hasEmail`, `hasPhone`, `email`, `phone` al endpoint de usuarios
2. **Crear endpoint combinado**: JOIN entre ClickHouse (analytics) y PostgreSQL (perfiles)
3. **Agregar búsqueda**: Endpoint de búsqueda por email/phone parcial

### Ejemplo de Implementación

```typescript
// Nuevo endpoint: GET /api/analytics/users-filtered/:site
export async function getUsersFiltered(req, res) {
  const { hasEmail, hasPhone, email, phone } = req.query;
  
  // 1. Obtener user_ids filtrados de PostgreSQL
  let profileQuery = db.select().from(trackedUserProfiles)
    .where(eq(trackedUserProfiles.siteId, siteId));
  
  if (hasEmail === 'true') {
    profileQuery = profileQuery.where(isNotNull(trackedUserProfiles.email));
  }
  if (hasPhone === 'true') {
    profileQuery = profileQuery.where(isNotNull(trackedUserProfiles.phone));
  }
  if (email) {
    profileQuery = profileQuery.where(like(trackedUserProfiles.email, `%${email}%`));
  }
  
  const profiles = await profileQuery;
  const userIds = profiles.map(p => p.userId);
  
  // 2. Obtener analytics de ClickHouse para esos user_ids
  const analytics = await clickhouse.query({
    query: `SELECT * FROM events WHERE user_id IN ({userIds:Array(String)})`,
    query_params: { userIds }
  });
  
  // 3. Combinar y retornar
  return res.send({ data: combinedData });
}
```

---

## 📚 Archivos Relevantes

| Archivo | Descripción |
|---------|-------------|
| `server/src/api/analytics/identifyUser.ts` | Endpoint POST /api/identify |
| `server/src/api/analytics/exportAnalyticsCSV.ts` | Endpoints de perfiles y export |
| `server/src/db/postgres/schema.ts` | Schema de tracked_user_profiles |
| `admin/src/utils/identity-manager.ts` | Captura de identidad en frontend |
| `admin/src/utils/rybbit-tracking.ts` | Eventos de tracking |
| `landing/src/lib/rybbit-tracking.ts` | Eventos de landing page |

---

*Documentación generada el: 2024*
*Versión: 1.0*
