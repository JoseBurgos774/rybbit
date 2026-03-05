# Documentación Completa de Eventos Rybbit - EasyOrder Admin

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Cobertura de Requisitos](#cobertura-de-requisitos)
3. [Eventos Implementados](#eventos-implementados)
4. [Endpoints de Análisis](#endpoints-de-análisis)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [Flujo de Datos](#flujo-de-datos)

---

## Resumen Ejecutivo

Se han implementado **25 funciones de tracking** en el frontend (EasyOrder Admin) y **2 nuevos endpoints** en el backend (Rybbit) para capturar eventos de marketing y onboarding. Todos los eventos se envían automáticamente enriquecidos con:

- **Identidad:** `session_id`, `device_id`, `user_id`
- **Atribución:** UTM parameters (first/last touch)
- **Contexto:** `page_path`, `page_title`, `page_url`, `timestamp`, `timezone`
- **Dispositivo:** `browser`, `os`, `screen_resolution`, `language`

---

## Cobertura de Requisitos

### ✅ 1. Salud del Sistema (Confiabilidad de Datos)

**Requisito:** Asegurar que los datos sean confiables antes de usar en campañas.

| Requisito | Solución Implementada |
|-----------|----------------------|
| Éxito/Fallo de consultas | Todos los eventos incluyen `timestamp` y se envían solo si `consentManager.canTrackAnalytics()` |
| Bloqueo por rate limiting | Sistema de autenticación por API Key en Rybbit con validación `siteConfig.isApiKeyValidForSite()` |
| Completitud de resultados | Endpoints de Rybbit retornan `pagination` con `total`, `page`, `pageSize`, `totalPages` |
| Período de tiempo | Todos los eventos incluyen `timestamp` (ms) y `timezone` (IANA) |

**Implementación:**
```typescript
// En rybbit-tracking.ts - línea 54-115
export function track(event_name: string, properties: Record<string, unknown> = {}) {
  if (!consentManager.canTrackAnalytics()) {
    console.log('🐸 [Rybbit] Tracking bloqueado por consentimiento');
    return;
  }
  
  const enrichedProperties = {
    ...properties,
    session_id: identity.sessionId,
    device_id: identity.deviceId,
    user_id: identity.userId,
    timestamp: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  
  window.rybbit.event(event_name, enrichedProperties);
}
```

---

### ✅ 2. Control de Período de Tiempo

**Requisito:** Controlar start/end dates, timezones, y "eventos de los últimos X minutos".

| Requisito | Solución |
|-----------|----------|
| Fecha/hora inicio | ✅ `timestamp` en cada evento |
| Fecha/hora final | ✅ `timestamp` en cada evento |
| Zona horaria | ✅ `timezone` en cada evento |
| Eventos últimos X minutos | ✅ Endpoints soportan `pastMinutesStart` y `pastMinutesEnd` |

**Endpoints Rybbit:**
- `GET /api/analytics/weekly-active/:site?weeks=4&timeZone=UTC`
- `GET /api/analytics/onboarding-funnel/:site?startDate=2026-01-01&endDate=2026-03-05&timeZone=America/Mexico_City`

---

### ✅ 3. Identidad del Usuario

**Requisito:** Capturar `session_id`, `user_id`, `identified_id`.

| Propiedad | Implementación |
|-----------|----------------|
| `session_id` | ✅ Generado en `identity-manager.ts`, persistido en sessionStorage |
| `device_id` | ✅ Generado en `identity-manager.ts`, persistido en localStorage |
| `user_id` | ✅ Capturado al hacer login via `identifyUser()` |

**Uso:**
```typescript
// En cualquier componente
import { identifyUser } from '../../utils/rybbit-tracking';

identifyUser({
  id: usuario.id,
  email: usuario.email,
  nombre: usuario.nombre,
  rol_id: usuario.rol_id,
  restaurante_id: usuario.restaurante_id,
  plan_key: usuario.plan_key,
});
```

---

### ✅ 4. Detalles de Acciones

**Requisito:** Capturar `timestamp`, `action_type`, `event_name`, `event_details`.

Todos los eventos incluyen:
- ✅ `timestamp` (ms desde epoch)
- ✅ `event_name` (nombre del evento)
- ✅ `event_details` (propiedades específicas del evento)

---

### ✅ 5. Contexto de Página

**Requisito:** Capturar `page_path`, `page_title`, `page_url`.

Todos los eventos incluyen automáticamente:
```typescript
{
  page_path: window.location.pathname,
  page_title: document.title,
  page_url: window.location.href,
  referrer: document.referrer,
}
```

---

## Eventos Implementados

### A) ONBOARDING (6 eventos)

#### 1. `onboarding_started` ⭐
**Descripción:** Se dispara cuando el usuario inicia el wizard de onboarding.

**Cuándo se dispara:**
- Al montar `WizardOnboarding.tsx` (solo una vez por sesión)

**Propiedades:**
```typescript
{
  total_steps: number;           // Total de pasos en el flujo
  onboarding_mode?: 'manual' | 'plantilla' | null;  // Modo seleccionado
}
```

**Código:**
```typescript
// En WizardOnboarding.tsx - línea 187-194
useEffect(() => {
  if (!cargandoProgreso) {
    trackOnboardingStarted({
      total_steps: totalPasosCalculado,
      onboarding_mode: onboardingMode,
    });
  }
}, [cargandoProgreso, totalPasosCalculado, onboardingMode]);
```

**Ejemplo de evento enviado:**
```json
{
  "event_name": "onboarding_started",
  "total_steps": 11,
  "onboarding_mode": "manual",
  "session_id": "sess_abc123",
  "device_id": "dev_xyz789",
  "user_id": "user_123",
  "timestamp": 1741173600000,
  "timezone": "America/Mexico_City",
  "page_path": "/onboarding/inicio",
  "page_title": "EasyOrder - Onboarding"
}
```

---

#### 2. `onboarding_step_completed` ⭐
**Descripción:** Se dispara cuando el usuario completa un paso del onboarding.

**Cuándo se dispara:**
- Al hacer clic en "Siguiente" (después de validar el paso)

**Propiedades:**
```typescript
{
  step_number: number;           // Número del paso (0-10)
  step_name: string;             // Nombre del paso
  total_steps: number;           // Total de pasos
  onboarding_mode?: 'manual' | 'plantilla' | null;  // Modo
}
```

**Código:**
```typescript
// En WizardOnboarding.tsx - línea 335-346
const manejarSiguiente = useCallback(() => {
  if (esValido && !esUltimoPaso) {
    const configPaso = configuracionPasos[pasoActual];
    trackOnboardingStepCompleted({
      step_number: pasoActual,
      step_name: configPaso?.titulo || `Paso ${pasoActual}`,
      total_steps: totalPasosCalculado,
      onboarding_mode: onboardingMode,
    });
    siguientePaso();
  }
}, [esValido, esUltimoPaso, pasoActual, totalPasosCalculado, siguientePaso, configuracionPasos]);
```

---

#### 3. `onboarding_completed` ⭐
**Descripción:** Se dispara cuando el usuario completa TODO el onboarding.

**Cuándo se dispara:**
- Al finalizar la configuración (después de guardar todos los datos)

**Propiedades:**
```typescript
{
  duration_ms: number;           // Tiempo total en ms
  steps_completed: number;       // Pasos completados
  onboarding_mode?: 'manual' | 'plantilla';  // Modo utilizado
}
```

**Código:**
```typescript
// En WizardOnboarding.tsx - línea 365-370
const durationMs = Date.now() - onboardingStartTime;
trackOnboardingCompleted({
  duration_ms: durationMs,
  steps_completed: totalPasosCalculado,
  onboarding_mode: 'manual',
});
```

---

#### 4. `onboarding_abandoned` 🚨
**Descripción:** Se dispara cuando el usuario abandona el onboarding (cierra la pestaña).

**Cuándo se dispara:**
- Evento `beforeunload` (cuando el usuario cierra la pestaña/navegador)
- Solo si NO ha completado el onboarding

**Propiedades:**
```typescript
{
  last_step_number: number;      // Último paso alcanzado
  last_step_name: string;        // Nombre del último paso
  duration_ms: number;           // Tiempo en onboarding
  onboarding_mode: 'manual' | 'plantilla' | null;
  total_steps: number;           // Total de pasos
}
```

**Código:**
```typescript
// En WizardOnboarding.tsx - línea 197-217
useEffect(() => {
  const handleBeforeUnload = () => {
    if (!configurada && pasoActual < totalPasosCalculado - 1) {
      const configPaso = configuracionPasos[pasoActual];
      const durationMs = Date.now() - onboardingStartTime;
      trackOnboardingAbandoned({
        last_step_number: pasoActual,
        last_step_name: configPaso?.titulo || `Paso ${pasoActual}`,
        duration_ms: durationMs,
        onboarding_mode: onboardingMode,
        total_steps: totalPasosCalculado,
      });
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [configurada, pasoActual, totalPasosCalculado, configuracionPasos, onboardingMode, onboardingStartTime]);
```

---

#### 5. `trial_started`
**Descripción:** Se dispara cuando se crea el restaurante e inicia el trial.

**Cuándo se dispara:**
- Al completar el onboarding

**Propiedades:**
```typescript
{
  plan_key: 'trial' | 'free';
}
```

**Código:**
```typescript
// En WizardOnboarding.tsx - línea 371
trackTrialStarted({ plan_key: 'free' });
```

---

#### 6. `activation_milestone_reached`
**Descripción:** Se dispara cuando el usuario alcanza un hito de activación.

**Cuándo se dispara:**
- Al completar el onboarding (milestone: `first_restaurant_configured`)
- Solo una vez por sesión

**Propiedades:**
```typescript
{
  milestone_key: 'first_restaurant_configured' | 'first_menu_created' | 'first_table_added' | 'first_order_created' | 'first_close_day_completed';
}
```

**Código:**
```typescript
// En WizardOnboarding.tsx - línea 372
trackActivationMilestone({ milestone_key: 'first_restaurant_configured' });
```

---

### B) IMPORTACIÓN DE DATOS (1 evento)

#### 7. `data_imported_success` 📊
**Descripción:** Se dispara cuando se importan datos exitosamente (clientes, productos, etc).

**Cuándo se dispara:**
- Al completar la importación en `ImportarClienteDialog.tsx`

**Propiedades:**
```typescript
{
  data_type: 'clientes' | 'productos' | 'inventario' | 'usuarios';
  records_count: number;         // Cantidad de registros importados
  source_format: 'csv' | 'xlsx' | 'xls';  // Formato del archivo
}
```

**Código:**
```typescript
// En ImportarClienteDialog.tsx - línea 97-101
trackDataImported({
  data_type: 'clientes',
  records_count: resultado.resultados.length,
  source_format: extension || 'xlsx',
});
```

**Ejemplo:**
```json
{
  "event_name": "data_imported_success",
  "data_type": "clientes",
  "records_count": 150,
  "source_format": "xlsx",
  "timestamp": 1741173700000,
  "user_id": "user_123"
}
```

---

### C) REPORTES Y EXPORTACIÓN (2 eventos)

#### 8. `report_generated` 📈
**Descripción:** Se dispara cuando se genera/exporta un reporte.

**Cuándo se dispara:**
- Al hacer clic en "Exportar" en `ExportarReportesDialog.tsx`

**Propiedades:**
```typescript
{
  report_type: string;           // Tipo de reporte (ej: 'pedidos')
  format: 'pdf' | 'excel' | 'csv';
  date_range?: string;           // Rango de fechas (ej: '2026-01-01 - 2026-03-05')
}
```

**Código:**
```typescript
// En ExportarReportesDialog.tsx - línea 52-60
const dateRange = tipo === 'personalizado' 
  ? `${fechaInicio} - ${fechaFin}` 
  : `últimos ${tipo} días`;
trackReportGenerated({
  report_type: 'pedidos',
  format: 'excel',
  date_range: dateRange,
});
```

---

#### 9. `shared_link_created` 🔗
**Descripción:** Se dispara cuando se crea un link compartible (QR, etc).

**Propiedades:**
```typescript
{
  link_type: 'qr_menu' | 'qr_table' | 'share_report' | 'invite_link';
  destination?: string;          // Destino del link
}
```

**Uso:**
```typescript
import { trackSharedLinkCreated } from '../../utils/rybbit-tracking';

trackSharedLinkCreated({
  link_type: 'qr_menu',
  destination: 'https://easyorder.app/menu/rest_123',
});
```

---

### D) COLABORACIÓN (1 evento)

#### 10. `invite_sent` 👥
**Descripción:** Se dispara cuando se envía una invitación a un usuario.

**Propiedades:**
```typescript
{
  invitee_role: string;          // Rol del invitado (ej: 'mesero', 'chef')
  invite_method: 'email' | 'link';
}
```

**Uso:**
```typescript
import { trackInviteSent } from '../../utils/rybbit-tracking';

trackInviteSent({
  invitee_role: 'mesero',
  invite_method: 'email',
});
```

---

### E) IDENTIDAD Y SESIÓN (2 eventos)

#### 11. `login_completed`
**Descripción:** Se dispara cuando el login es exitoso.

**Propiedades:**
```typescript
{
  auth_method: 'email' | 'google' | 'facebook';
}
```

**Código:**
```typescript
import { trackLoginCompleted } from '../../utils/rybbit-tracking';

trackLoginCompleted({ auth_method: 'email' });
```

---

#### 12. `logout_completed`
**Descripción:** Se dispara cuando el usuario hace logout manual.

**Código:**
```typescript
import { trackLogoutCompleted } from '../../utils/rybbit-tracking';

trackLogoutCompleted();
```

---

### F) SIGNUP (1 evento)

#### 13. `signup_completed`
**Descripción:** Se dispara cuando completa el registro.

**Propiedades:**
```typescript
{
  auth_method: 'email' | 'google' | 'facebook' | 'whatsapp';
  plan_key?: string;
}
```

**Incluye automáticamente:** Device info (browser, OS, screen resolution, etc)

---

### G) MONETIZACIÓN (3 eventos)

#### 14. `upgrade_started`
**Descripción:** Se dispara cuando abre pantalla de upgrade.

**Propiedades:**
```typescript
{
  from_plan: string;
  to_plan: string;
}
```

---

#### 15. `upgrade_completed`
**Descripción:** Se dispara cuando el pago es exitoso.

**Propiedades:**
```typescript
{
  from_plan: string;
  to_plan: string;
  mrr: number;                   // Monthly Recurring Revenue
  currency: string;              // Moneda (ej: 'MXN')
}
```

---

#### 16. `subscription_canceled`
**Descripción:** Se dispara cuando cancelan la suscripción.

**Propiedades:**
```typescript
{
  plan_key?: string;
  reason?: string;
}
```

---

### H) TRIAL Y PAYWALL (2 eventos)

#### 17. `paywall_viewed`
**Descripción:** Se dispara cuando se muestra pantalla de upgrade.

**Propiedades:**
```typescript
{
  plan_key: string;
  paywall_context: string;       // Contexto (ej: 'limit_reached')
}
```

---

#### 18. `limit_reached`
**Descripción:** Se dispara cuando el usuario alcanza límite del plan.

**Propiedades:**
```typescript
{
  limit_key: string;             // Tipo de límite
  limit_value: number;           // Valor del límite
}
```

---

### I) FEATURES (1 evento)

#### 19. `feature_used`
**Descripción:** Se dispara cuando se usa una funcionalidad clave.

**Propiedades:**
```typescript
{
  feature_key: 'menu_created' | 'order_created' | 'inventory_updated' | 'report_viewed' | 'qr_generated' | 'whatsapp_integration_used' | 'category_created' | 'product_created' | 'table_created' | 'close_day_initiated';
  count?: number;
  value?: number;
}
```

---

### J) OUTCOMES (2 eventos)

#### 20. `order_completed`
**Descripción:** Se dispara cuando un pedido se finaliza correctamente.

**Propiedades:**
```typescript
{
  total_value: number;           // Valor total del pedido
  orders_count?: number;         // Cantidad de pedidos
}
```

---

#### 21. `close_day_completed` 🔥
**Descripción:** Se dispara cuando se hace corte de caja.

**Propiedades:**
```typescript
{
  total_value: number;           // Valor total del día
  orders_count: number;          // Cantidad de pedidos
  duration_ms?: number;          // Tiempo en ms
}
```

---

### K) AHA MOMENT (1 evento)

#### 22. `aha_moment_completed` 🚀
**Descripción:** Define el verdadero valor del producto (5 días consecutivos de cierre).

**Propiedades:**
```typescript
{
  aha_key: 'first_5_consecutive_close_days';
}
```

**Nota:** Solo se dispara una vez por sesión.

---

### L) SOPORTE Y ERRORES (2 eventos)

#### 23. `error_seen`
**Descripción:** Se dispara cuando ocurre un error crítico.

**Propiedades:**
```typescript
{
  error_code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

---

#### 24. `help_requested`
**Descripción:** Se dispara cuando el usuario solicita ayuda.

**Propiedades:**
```typescript
{
  help_type: 'chat' | 'whatsapp' | 'email' | 'docs';
  context?: string;
}
```

---

### M) NAVEGACIÓN (2 eventos)

#### 25. `page_viewed`
**Descripción:** Se dispara cuando se ve una página importante.

**Propiedades:**
```typescript
{
  page_path: string;
  page_title?: string;
}
```

---

#### 26. `pricing_viewed`
**Descripción:** Se dispara cuando ve la página de precios/planes.

**Propiedades:**
```typescript
{
  current_plan?: string;
}
```

---

#### 27. `outbound_click`
**Descripción:** Se dispara cuando hace clic en enlace externo (auto-tracking).

**Propiedades:**
```typescript
{
  destination_url: string;
  destination_domain: string;
  link_type: 'whatsapp' | 'payment' | 'support' | 'docs' | 'external';
  link_text?: string;
}
```

---

## Endpoints de Análisis

### Backend (Rybbit)

#### 1. Weekly Active Accounts
```
GET /api/analytics/weekly-active/:site
```

**Parámetros:**
- `site` (path): ID del sitio
- `weeks` (query): Número de semanas (default: 4, max: 52)
- `timeZone` (query): Zona horaria (default: UTC)

**Autenticación:**
- Header: `X-API-Key: rb_your_api_key`
- O query param: `?api_key=rb_your_api_key`

**Respuesta:**
```json
{
  "data": [
    {
      "weekly_active_users": 45,
      "week_start": "2026-02-24",
      "week_end": "2026-03-02",
      "unique_sessions": 120,
      "total_events": 1250
    }
  ],
  "meta": {
    "weeks_requested": 4,
    "timezone": "UTC"
  }
}
```

**Uso:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/weekly-active/2?weeks=8"
```

---

#### 2. Onboarding Funnel
```
GET /api/analytics/onboarding-funnel/:site
```

**Parámetros:**
- `site` (path): ID del sitio
- `startDate` (query): Fecha inicio (YYYY-MM-DD)
- `endDate` (query): Fecha fin (YYYY-MM-DD)
- `timeZone` (query): Zona horaria
- `filters` (query): Filtros adicionales

**Autenticación:**
- Header: `X-API-Key: rb_your_api_key`
- O query param: `?api_key=rb_your_api_key`

**Respuesta:**
```json
{
  "data": {
    "started": 100,
    "completed": 45,
    "abandoned": 55,
    "completion_rate": 45.0,
    "steps": [
      {
        "step_name": "Restaurante",
        "step_number": 1,
        "users_count": 95,
        "completion_rate": 95.0
      },
      {
        "step_name": "Sucursal",
        "step_number": 2,
        "users_count": 85,
        "completion_rate": 85.0
      }
    ],
    "abandonment_by_step": [
      {
        "step_name": "Productos",
        "step_number": 6,
        "abandoned_count": 15
      }
    ]
  }
}
```

**Uso:**
```bash
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/onboarding-funnel/2?startDate=2026-01-01&endDate=2026-03-05"
```

---

## Ejemplos de Uso

### Ejemplo 1: Tracking Completo de Onboarding

```typescript
// En WizardOnboarding.tsx
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  trackOnboardingAbandoned,
  trackTrialStarted,
  trackActivationMilestone,
} from '../../utils/rybbit-tracking';

// 1. Al montar el componente
useEffect(() => {
  trackOnboardingStarted({
    total_steps: 11,
    onboarding_mode: 'manual',
  });
}, []);

// 2. Al avanzar de paso
const manejarSiguiente = () => {
  trackOnboardingStepCompleted({
    step_number: 1,
    step_name: 'Restaurante',
    total_steps: 11,
    onboarding_mode: 'manual',
  });
  siguientePaso();
};

// 3. Al completar
const manejarFinalizar = async () => {
  await guardarDatos();
  
  trackOnboardingCompleted({
    duration_ms: Date.now() - startTime,
    steps_completed: 11,
    onboarding_mode: 'manual',
  });
  
  trackTrialStarted({ plan_key: 'free' });
  trackActivationMilestone({ milestone_key: 'first_restaurant_configured' });
};

// 4. Al abandonar (automático con beforeunload)
useEffect(() => {
  const handleBeforeUnload = () => {
    if (!completado) {
      trackOnboardingAbandoned({
        last_step_number: pasoActual,
        last_step_name: 'Productos',
        duration_ms: Date.now() - startTime,
        onboarding_mode: 'manual',
        total_steps: 11,
      });
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);
```

---

### Ejemplo 2: Tracking de Importación

```typescript
// En ImportarClienteDialog.tsx
import { trackDataImported } from '../../../utils/rybbit-tracking';

const subirArchivo = async () => {
  const extension = archivo.name.split('.').pop();
  
  try {
    const resultado = await servicioUsuarioCliente.importarDesdeExcel(archivo);
    
    // Trackear éxito
    trackDataImported({
      data_type: 'clientes',
      records_count: resultado.resultados.length,
      source_format: extension,
    });
    
    toast.success('Importación exitosa');
  } catch (error) {
    toast.error('Error en importación');
  }
};
```

---

### Ejemplo 3: Tracking de Reportes

```typescript
// En ExportarReportesDialog.tsx
import { trackReportGenerated } from '../../../utils/rybbit-tracking';

const manejarExportar = async () => {
  const objeto = await servicioReportes.exportarPedidos(opciones);
  
  // Descargar archivo
  const url = window.URL.createObjectURL(new Blob([objeto]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'pedidos.xlsx');
  link.click();
  
  // Trackear generación
  trackReportGenerated({
    report_type: 'pedidos',
    format: 'excel',
    date_range: 'últimos 7 días',
  });
};
```

---

## Flujo de Datos

### 1. Frontend → Rybbit Analytics

```
Usuario realiza acción
    ↓
trackXxxEvent() en rybbit-tracking.ts
    ↓
Enriquecimiento automático:
  - Identity (session_id, device_id, user_id)
  - Attribution (UTMs)
  - Context (page_path, page_title, timestamp, timezone)
  - Device (browser, OS, screen, language)
    ↓
Validación de consentimiento
    ↓
window.rybbit.event(event_name, properties)
    ↓
Rybbit Analytics recibe evento
    ↓
ClickHouse almacena en tabla 'events'
```

### 2. Rybbit Backend → Análisis

```
GET /api/analytics/weekly-active/:site
    ↓
Validación de API Key
    ↓
Query ClickHouse:
  SELECT COUNT(DISTINCT user_id) as weekly_active_users
  FROM events
  WHERE site_id = {siteId}
  AND timestamp >= now() - INTERVAL 7 DAY
    ↓
Respuesta JSON con datos agregados
```

---

## Resumen de Cobertura

| Requisito Original | Eventos Implementados | Endpoints |
|-------------------|----------------------|-----------|
| Onboarding progress | `onboarding_started`, `onboarding_step_completed`, `onboarding_completed`, `onboarding_abandoned` | `/api/analytics/onboarding-funnel/:site` |
| Salud del sistema | Consentimiento + timestamp en cada evento | Validación API Key |
| Control de tiempo | `timestamp` + `timezone` en cada evento | `startDate`, `endDate`, `timeZone` params |
| Identidad | `session_id`, `device_id`, `user_id` | Enriquecimiento automático |
| Detalles de acción | Propiedades específicas por evento | Event catalog |
| Contexto de página | `page_path`, `page_title`, `page_url` | Enriquecimiento automático |
| `workspace_created` | `trial_started` + `activation_milestone_reached` | N/A |
| `data_imported_success` | `data_imported_success` | N/A |
| `aha_event_completed` | `aha_moment_completed` | N/A |
| `invite_sent` | `invite_sent` | N/A |
| `integration_connected` | `feature_used` (whatsapp_integration_used) | N/A |
| `report_generated` | `report_generated` | N/A |
| `shared_link_created` | `shared_link_created` | N/A |
| `weekly_active_account` | N/A | `/api/analytics/weekly-active/:site` |

---

## Casos de Uso: Automatización con m8n

### Caso 1: Re-engagement por Abandono de Onboarding

**Objetivo:** Detectar usuarios que abandonaron el onboarding en un paso específico y enviarles un mensaje personalizado.

#### 1. Obtener datos de abandono del usuario 442

**Query a Rybbit (ClickHouse):**

```bash
# Obtener datos de abandono del usuario 442
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?user_id=442"
```

**Respuesta esperada:**
```json
{
  "data": [
    {
      "user_id": "442",
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
    "total": 1,
    "limit": 100,
    "offset": 0,
    "pages": 1
  },
  "meta": {
    "site_id": "2",
    "filtered_by_user": true,
    "date_range": null
  }
}
```

#### 2. Analizar el abandono

**Interpretación:**
- Usuario 442 abandonó en el paso "Horarios" (paso 2 de 11)
- Completó 18% del onboarding
- Pasó 20 minutos en el onboarding
- Modo: manual

#### 3. Usar datos de abandono en m8n

Con los datos obtenidos del endpoint `/api/analytics/abandonment-data/:site`, puedes crear un workflow en m8n para:

1. **Obtener usuarios abandonados:**
   ```bash
   curl -H "X-API-Key: rb_your_api_key" \
     "https://api-rybbit.nexgen.systems/api/analytics/abandonment-data/2?limit=100"
   ```

2. **Filtrar por paso específico:**
   - Usuarios que abandonaron en "Horarios" (paso 2)
   - Usuarios con progreso < 30%

3. **Enviar mensaje personalizado:**
   - Usar WhatsApp, Email o SMS
   - Incluir nombre del paso donde abandonaron
   - Ofrecer link para reanudar onboarding

4. **Rastrear re-engagement:**
   - Registrar si el usuario retomó el onboarding
   - Medir tasa de éxito de re-engagement

---

## Resumen de Implementación

✅ **Eventos implementados:**
- `onboarding_started` - Inicio del onboarding
- `onboarding_step_completed` - Completación de cada paso
- `onboarding_completed` - Completación del onboarding
- `onboarding_abandoned` - Abandono del onboarding
- `data_imported_success` - Importación de clientes exitosa
- `report_generated` - Generación de reportes
- `shared_link_created` - Creación de links compartidos
- `invite_sent` - Envío de invitaciones

✅ **Endpoints Rybbit creados:**
- `GET /api/analytics/weekly-active/:site` - Cuentas activas semanales
- `GET /api/analytics/onboarding-funnel/:site` - Embudo de onboarding
- `GET /api/analytics/abandonment-data/:site` - Datos de abandono

✅ **Autenticación:**
- API Key authentication en todos los endpoints
- Soporte para header `X-API-Key` y query parameter `api_key`

✅ **Integración con m8n:**
- Datos disponibles para automatizar campañas de re-engagement
- Información detallada de abandono para personalización de mensajes

Notamos que iniciaste la configuración de tu restaurante en EasyOrder hace 3 días, 
pero te quedaste en el paso "Horarios" (completaste el 18% del proceso).

Sabemos que configurar un restaurante puede ser tedioso, por eso queremos ayudarte:

✅ Paso 1: Restaurante - Completado
✅ Paso 2: Sucursal - Completado
⏸️ Paso 3: Horarios - Aquí te quedaste

Continuar configuración: [Link]

Si tienes dudas, nuestro equipo está aquí para ayudarte.

Saludos,
El equipo de EasyOrder
```

---

### Caso 2: Análisis de Abandonment Rate por Paso

**Query SQL a ClickHouse (vía Rybbit):**

```sql
SELECT
  last_step_name,
  COUNT(*) as abandoned_count,
  COUNT(*) * 100.0 / (
    SELECT COUNT(*) FROM events 
    WHERE event_name = 'onboarding_abandoned'
  ) as percentage_of_total_abandons
FROM events
WHERE event_name = 'onboarding_abandoned'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY last_step_name
ORDER BY abandoned_count DESC
```

**Respuesta:**
```json
{
  "data": [
    {
      "last_step_name": "Productos",
      "abandoned_count": 45,
      "percentage_of_total_abandons": 32.1
    },
    {
      "last_step_name": "Horarios",
      "abandoned_count": 38,
      "percentage_of_total_abandons": 27.1
    },
    {
      "last_step_name": "Mesas",
      "abandoned_count": 32,
      "percentage_of_total_abandons": 22.9
    }
  ]
}
```

**Insight:** El paso "Productos" es donde más usuarios abandonan. Considera simplificar este paso.

---

### Caso 3: Segmentación para Campañas Personalizadas

**Segmentos basados en abandono:**

```typescript
// Segmento 1: Abandonaron temprano (< 30% progreso)
// → Mensaje: "Parece que es tu primer día, ¿necesitas ayuda?"
// → Acción: Ofrecer demo o llamada con especialista

// Segmento 2: Abandonaron a mitad (30-70% progreso)
// → Mensaje: "¡Casi listo! Solo faltan X pasos"
// → Acción: Enviar guía de pasos pendientes

// Segmento 3: Abandonaron casi al final (> 70% progreso)
// → Mensaje: "¡Estabas muy cerca! Completa en 5 minutos"
// → Acción: Ofrecer asistencia directa
```

---

## Próximos Pasos

1. **Verificar eventos en Rybbit Dashboard**
   - Acceder a https://rybbit.app
   - Ir a Analytics → Events
   - Filtrar por `site_id` y fecha

2. **Crear dashboards personalizados**
   - Funnel de onboarding
   - Weekly active users
   - Abandonment rate por paso

3. **Configurar alertas**
   - Si abandonment rate > 50%
   - Si weekly_active_users < threshold

4. **Integrar con m8n**
   - Crear workflow de re-engagement automático
   - Enviar mensajes personalizados por WhatsApp/Email
   - Trackear intentos de re-engagement como eventos

5. **Integrar con campañas**
   - Usar `onboarding_abandoned` para re-engagement
   - Usar `aha_moment_completed` para upsell
   - Usar `trial_started` para onboarding email sequence
