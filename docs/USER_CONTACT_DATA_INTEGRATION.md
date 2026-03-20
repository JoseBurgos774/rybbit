# Integración de Datos de Contacto en Vista de Usuario

## Descripción

Este documento describe cómo integrar los datos de contacto (email, teléfono, nombre) en la vista de detalle del usuario en Rybbit. Esta funcionalidad permite que administradores y agentes de soporte visualicen información de contacto del usuario para identificarlo, dar seguimiento y brindar atención comercial.

## Configuración

### Variable de Entorno Requerida

Para que Rybbit pueda consultar los datos de usuario directamente desde la BD de EasyOrder, necesitas configurar:

```env
EASYORDER_DATABASE_URL=postgresql://usuario:password@host:5432/easyorder_db
```

Esta variable permite a Rybbit consultar la tabla `usuarios` de EasyOrder para obtener:
- `correo_electronico` (email)
- `nombre` (name)
- `telefono` (phone) - cuando esté disponible

### Fuentes de Datos

Los endpoints consultan datos en el siguiente orden de prioridad:

1. **Tabla local `tracked_user_profiles`** - Datos enviados via `/api/identify`
2. **BD de EasyOrder** - Consulta directa a la tabla `usuarios`

Si no se configura `EASYORDER_DATABASE_URL`, solo se usará la fuente local.

## Endpoints Disponibles

### 1. Obtener datos de contacto de un usuario específico

**Endpoint:**
```
GET /api/analytics/user/:userId/:site
```

**Parámetros:**
- `userId` (string): ID del usuario en Rybbit
- `site` (string): ID del sitio/organización

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "124",
    "email": "usuario@easyorder.mx",
    "phone": "+5216871234567",
    "name": "Juan Pérez",
    "created_at": "2026-03-20T14:05:00Z",
    "updated_at": "2026-03-20T14:05:00Z"
  }
}
```

**Respuesta cuando no hay datos:**
```json
{
  "success": true,
  "data": {
    "user_id": "124",
    "email": null,
    "phone": null,
    "name": null,
    "created_at": null,
    "updated_at": null
  },
  "message": "No contact data available for this user"
}
```

**Errores:**
- `403`: No autorizado para acceder a este sitio
- `500`: Error interno del servidor

### 2. Obtener todos los usuarios identificados de un sitio

**Endpoint:**
```
GET /api/analytics/user-profiles/:site?limit=100&offset=0
```

**Parámetros:**
- `site` (string): ID del sitio
- `limit` (number, opcional): Máximo 1000, default 100
- `offset` (number, opcional): Default 0

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "124",
      "email": "usuario@easyorder.mx",
      "phone": "+5216871234567",
      "name": "Juan Pérez",
      "created_at": "2026-03-20T14:05:00Z",
      "updated_at": "2026-03-20T14:05:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 1
  }
}
```

## Flujo de Datos

```
1. Usuario inicia sesión en EasyOrder Admin
   ↓
2. Se llama POST /api/identify con email, phone, name
   ↓
3. Datos se almacenan en PostgreSQL (tabla: tracked_user_profiles)
   ↓
4. Administrador accede a vista de usuario en Rybbit
   ↓
5. Frontend llama GET /api/analytics/user/:userId/:site
   ↓
6. Se muestran datos de contacto en la UI
```

## Integración en Frontend (Rybbit)

### Componente React para mostrar datos de contacto

```typescript
import { useEffect, useState } from 'react';

interface UserContactData {
  user_id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface UserContactCardProps {
  userId: string;
  siteId: string;
  apiBaseUrl: string;
}

export function UserContactCard({ userId, siteId, apiBaseUrl }: UserContactCardProps) {
  const [contactData, setContactData] = useState<UserContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContactData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${apiBaseUrl}/api/analytics/user/${userId}/${siteId}`
        );
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        setContactData(result.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setContactData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContactData();
  }, [userId, siteId, apiBaseUrl]);

  if (loading) {
    return <div className="p-4 text-gray-500">Cargando datos de contacto...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!contactData) {
    return <div className="p-4 text-gray-500">No hay datos disponibles</div>;
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
      
      <div className="space-y-3">
        {/* Email */}
        <div>
          <label className="text-sm font-medium text-gray-600">Correo Electrónico</label>
          <p className="text-base">
            {contactData.email ? (
              <a href={`mailto:${contactData.email}`} className="text-blue-600 hover:underline">
                {contactData.email}
              </a>
            ) : (
              <span className="text-gray-400">No disponible</span>
            )}
          </p>
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-medium text-gray-600">Teléfono</label>
          <p className="text-base">
            {contactData.phone ? (
              <a href={`tel:${contactData.phone}`} className="text-blue-600 hover:underline">
                {contactData.phone}
              </a>
            ) : (
              <span className="text-gray-400">No disponible</span>
            )}
          </p>
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-medium text-gray-600">Nombre</label>
          <p className="text-base">
            {contactData.name ? (
              contactData.name
            ) : (
              <span className="text-gray-400">No disponible</span>
            )}
          </p>
        </div>

        {/* Last Updated */}
        {contactData.updated_at && (
          <div className="text-xs text-gray-400 mt-4 pt-4 border-t">
            Última actualización: {new Date(contactData.updated_at).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Uso en la vista de detalle del usuario

```typescript
// En el componente de detalle del usuario
<UserContactCard 
  userId={userId}
  siteId={siteId}
  apiBaseUrl={process.env.REACT_APP_API_BASE_URL}
/>
```

## Casos de Uso

### 1. Usuario identificado con datos completos
```
✓ Email: usuario@easyorder.mx
✓ Teléfono: +5216871234567
✓ Nombre: Juan Pérez
```

### 2. Usuario identificado sin teléfono
```
✓ Email: usuario@easyorder.mx
✗ Teléfono: No disponible
✓ Nombre: Juan Pérez
```

### 3. Usuario no identificado
```
✗ Email: No disponible
✗ Teléfono: No disponible
✗ Nombre: No disponible
```

## Consideraciones de Seguridad

1. **Autenticación**: El endpoint valida que el usuario tenga acceso al sitio
2. **Privacidad**: Solo se muestran datos de contacto a usuarios autorizados
3. **Validación**: Se valida que el userId corresponda al sitio correcto
4. **Auditoría**: Se registran created_at y updated_at para rastrear cambios

## Flujo de Identificación de Usuarios

### En el Login (EasyOrder Admin)

```typescript
// En identity-manager.ts
setAuthenticatedUser(user: {
  id: number;
  email?: string;
  nombre?: string;
  // ... otros campos
}) {
  // Se envía POST /api/identify automáticamente
  window.rybbit.identify(String(user.id), {
    email: user.email,
    nombre: user.nombre,
    // ... otros traits
  });
}
```

### En el Backend (Rybbit)

```typescript
// POST /api/identify
{
  "user_id": "124",
  "email": "usuario@easyorder.mx",
  "phone": "+5216871234567"
}
```

Se almacena en: `tracked_user_profiles` table en PostgreSQL

## Testing

### Prueba 1: Obtener datos de un usuario identificado
```bash
curl -X GET "http://localhost:3000/api/analytics/user/124/1" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Prueba 2: Obtener datos de usuario sin identificar
```bash
curl -X GET "http://localhost:3000/api/analytics/user/999/1" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Prueba 3: Listar todos los usuarios identificados
```bash
curl -X GET "http://localhost:3000/api/analytics/user-profiles/1?limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Criterios de Aceptación - Validación

- [x] Endpoint GET /api/analytics/user/:userId/:site implementado
- [x] Endpoint GET /api/analytics/user-profiles/:site implementado
- [x] Validación de acceso al sitio
- [x] Manejo de usuarios sin datos identificados
- [x] Respuestas consistentes con estructura definida
- [ ] Integración en frontend de Rybbit (pendiente)
- [ ] Testing end-to-end (pendiente)
- [ ] Validación por negocio (pendiente)

## Próximos Pasos

1. Integrar componente `UserContactCard` en la vista de detalle del usuario
2. Agregar estilos y validaciones en el frontend
3. Realizar testing end-to-end
4. Validar con el equipo de negocio
5. Documentar en la guía de usuario de Rybbit
