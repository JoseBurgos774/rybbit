# 📖 Índice Completo - Documentación Rybbit para m8n

## 🎯 Comienza Aquí

Si es tu primera vez usando los endpoints de Rybbit para m8n, sigue este orden:

1. **[REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md)** ⭐ (5 min)
   - Visión general de todos los endpoints
   - Filtros disponibles
   - Ejemplos rápidos

2. **[EJEMPLOS_M8N_LISTOS.md](./EJEMPLOS_M8N_LISTOS.md)** ⭐ (10 min)
   - 7 workflows listos para copiar/pegar
   - Configuración paso a paso
   - Tips de implementación

3. **[GUIA_COMPLETA_ENDPOINTS_M8N.md](./GUIA_COMPLETA_ENDPOINTS_M8N.md)** (20 min)
   - Documentación detallada de cada endpoint
   - Todos los parámetros explicados
   - Casos de uso comunes

---

## 📚 Documentación Disponible

### Documentación Principal

#### 1. **REFERENCIA_RAPIDA_ENDPOINTS.md**
**Mejor para:** Búsqueda rápida, cheat sheet

**Contiene:**
- ✅ Lista de todos los endpoints
- ✅ Filtros disponibles por endpoint
- ✅ Casos de uso rápidos
- ✅ Estructura de respuestas
- ✅ Combinaciones útiles de filtros
- ✅ Errores comunes

**Cuándo usarlo:**
- Necesitas recordar la sintaxis de un endpoint
- Buscas un filtro específico
- Quieres ver ejemplos rápidos

---

#### 2. **EJEMPLOS_M8N_LISTOS.md**
**Mejor para:** Implementación inmediata

**Contiene:**
- ✅ 7 workflows completos en YAML
- ✅ Campaña de email diaria
- ✅ Campaña de WhatsApp
- ✅ Segmentación por progreso
- ✅ Campaña multicanal
- ✅ Análisis de datos
- ✅ Búsqueda de usuarios
- ✅ Sincronización de datos

**Cuándo usarlo:**
- Quieres implementar rápidamente
- Necesitas un workflow base
- Buscas inspiración para tu caso

**Cómo usarlo:**
1. Copia el workflow que necesites
2. Reemplaza variables de entorno
3. Ajusta templates y horarios
4. Prueba con `limit=10` primero

---

#### 3. **GUIA_COMPLETA_ENDPOINTS_M8N.md**
**Mejor para:** Referencia detallada

**Contiene:**
- ✅ Documentación completa de cada endpoint
- ✅ Parámetros detallados
- ✅ Ejemplos de uso
- ✅ Estructura de respuestas
- ✅ Filtros por endpoint
- ✅ Casos de uso comunes
- ✅ Integración con m8n
- ✅ Variables disponibles

**Cuándo usarlo:**
- Necesitas entender un endpoint en profundidad
- Quieres ver todas las opciones disponibles
- Buscas ejemplos detallados

---

### Documentación Técnica

#### 4. **ABANDONMENT_DATA_ENDPOINT.md**
**Mejor para:** Detalles técnicos de abandonment

**Contiene:**
- ✅ Documentación completa del endpoint
- ✅ Parámetros de filtrado
- ✅ Ejemplos de uso
- ✅ Estructura de respuesta
- ✅ Casos de uso
- ✅ Integración con m8n
- ✅ Códigos de error

---

#### 5. **RYBBIT_FILTRADO_EMAIL_PHONE.md**
**Mejor para:** Detalles técnicos de user-profiles

**Contiene:**
- ✅ Documentación del endpoint user-profiles
- ✅ Filtros de email/phone
- ✅ Ejemplos de uso
- ✅ Estructura de respuesta
- ✅ Arquitectura del sistema

---

## 🚀 Guía Rápida por Caso de Uso

### Quiero enviar emails a usuarios que abandonaron

**Pasos:**
1. Lee: [REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md) - Sección "Campaña de Email"
2. Usa: [EJEMPLOS_M8N_LISTOS.md](./EJEMPLOS_M8N_LISTOS.md) - Ejemplo 1
3. Referencia: [GUIA_COMPLETA_ENDPOINTS_M8N.md](./GUIA_COMPLETA_ENDPOINTS_M8N.md) - Sección "Ejemplo 1"

**Endpoint:** `GET /api/analytics/abandonment-data/:site`

**Filtros clave:**
```
minHoursAgo=5
maxHoursAgo=48
unique_users=true
```

---

### Quiero enviar WhatsApp a usuarios específicos

**Pasos:**
1. Lee: [REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md) - Sección "Campaña de WhatsApp"
2. Usa: [EJEMPLOS_M8N_LISTOS.md](./EJEMPLOS_M8N_LISTOS.md) - Ejemplo 2
3. Referencia: [GUIA_COMPLETA_ENDPOINTS_M8N.md](./GUIA_COMPLETA_ENDPOINTS_M8N.md) - Sección "Ejemplo 2"

**Endpoint:** `GET /api/analytics/abandonment-data/:site`

**Filtros clave:**
```
minHoursAgo=5
unique_users=true
# Luego filtrar por: phone != null
```

---

### Quiero segmentar usuarios por progreso

**Pasos:**
1. Lee: [REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md) - Sección "Análisis Completo"
2. Usa: [EJEMPLOS_M8N_LISTOS.md](./EJEMPLOS_M8N_LISTOS.md) - Ejemplo 3
3. Referencia: [GUIA_COMPLETA_ENDPOINTS_M8N.md](./GUIA_COMPLETA_ENDPOINTS_M8N.md) - Sección "Ejemplo 3"

**Endpoint:** `GET /api/analytics/abandonment-data/:site`

**Filtros clave:**
```
unique_users=true
limit=1000
# Luego segmentar por: progress_percentage
```

---

### Quiero buscar usuarios por email

**Pasos:**
1. Lee: [REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md) - Sección "Buscar por Email"
2. Usa: [EJEMPLOS_M8N_LISTOS.md](./EJEMPLOS_M8N_LISTOS.md) - Ejemplo 6
3. Referencia: [GUIA_COMPLETA_ENDPOINTS_M8N.md](./GUIA_COMPLETA_ENDPOINTS_M8N.md) - Sección "Búsqueda de Usuario"

**Endpoint:** `GET /api/analytics/user-profiles/:site`

**Filtros clave:**
```
email=dominio
hasEmail=true
```

---

### Quiero hacer una campaña multicanal

**Pasos:**
1. Lee: [REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md) - Sección "Multicanal"
2. Usa: [EJEMPLOS_M8N_LISTOS.md](./EJEMPLOS_M8N_LISTOS.md) - Ejemplo 4
3. Referencia: [GUIA_COMPLETA_ENDPOINTS_M8N.md](./GUIA_COMPLETA_ENDPOINTS_M8N.md) - Sección "Ejemplo 4"

**Endpoint:** `GET /api/analytics/abandonment-data/:site`

**Filtros clave:**
```
minHoursAgo=5
maxHoursAgo=72
unique_users=true
# Enviar por email si disponible, WhatsApp si disponible
```

---

### Quiero analizar abandonos por paso

**Pasos:**
1. Lee: [REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md) - Sección "Análisis Completo"
2. Usa: [EJEMPLOS_M8N_LISTOS.md](./EJEMPLOS_M8N_LISTOS.md) - Ejemplo 5
3. Referencia: [GUIA_COMPLETA_ENDPOINTS_M8N.md](./GUIA_COMPLETA_ENDPOINTS_M8N.md) - Sección "Análisis de Abandonment"

**Endpoint:** `GET /api/analytics/abandonment-data/:site`

**Filtros clave:**
```
unique_users=true
limit=1000
# Agrupar por: last_step_name
```

---

## 📋 Endpoints Disponibles

### 1. Obtener Perfiles de Usuario
```
GET /api/analytics/user-profiles/:site
```
**Documentación:** [RYBBIT_FILTRADO_EMAIL_PHONE.md](./RYBBIT_FILTRADO_EMAIL_PHONE.md)

**Filtros:**
- `hasEmail=true` - Solo con email
- `hasPhone=true` - Solo con teléfono
- `hasContact=true` - Con email O teléfono
- `email=dominio` - Búsqueda por dominio
- `phone=prefijo` - Búsqueda por prefijo
- `search=texto` - Búsqueda general

---

### 2. Obtener Abandonos de Onboarding
```
GET /api/analytics/abandonment-data/:site
```
**Documentación:** [ABANDONMENT_DATA_ENDPOINT.md](./ABANDONMENT_DATA_ENDPOINT.md)

**Filtros:**
- `unique_users=true` - Un registro por usuario
- `minHoursAgo=5` - Solo eventos con más de 5 horas
- `maxHoursAgo=48` - Solo eventos de últimas 48 horas
- `startDate=YYYY-MM-DD` - Fecha inicio
- `endDate=YYYY-MM-DD` - Fecha fin
- `timeZone=America/Mexico_City` - Zona horaria

---

### 3. Obtener Perfil Individual
```
GET /api/analytics/user/:userId/:site
```
**Documentación:** [RYBBIT_FILTRADO_EMAIL_PHONE.md](./RYBBIT_FILTRADO_EMAIL_PHONE.md)

---

### 4. Exportar a CSV
```
GET /api/analytics/export-csv/:site
```
**Documentación:** [RYBBIT_FILTRADO_EMAIL_PHONE.md](./RYBBIT_FILTRADO_EMAIL_PHONE.md)

**Filtros:**
- `includeUserProfiles=true` - Incluir email/phone

---

## 🔑 Variables Disponibles en Respuestas

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

## ⚙️ Configuración Requerida

### Variables de Entorno
```env
RYBBIT_API_KEY=rb_your_api_key_here
RYBBIT_SITE_ID=2
```

### Headers Requeridos
```
X-API-Key: ${RYBBIT_API_KEY}
```

### Autenticación
```bash
# Opción 1: Header
curl -H "X-API-Key: rb_your_api_key" \
  "https://api-rybbit.nexgen.systems/api/analytics/..."

# Opción 2: Query Parameter
curl "https://api-rybbit.nexgen.systems/api/analytics/...?api_key=rb_your_api_key"
```

---

## 🎓 Flujo de Aprendizaje Recomendado

### Día 1: Fundamentos
1. Lee [REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md) (5 min)
2. Prueba un endpoint simple con curl (5 min)
3. Entiende la estructura de respuesta (5 min)

### Día 2: Primeros Workflows
1. Lee [EJEMPLOS_M8N_LISTOS.md](./EJEMPLOS_M8N_LISTOS.md) - Ejemplo 1 (10 min)
2. Copia el workflow a m8n (5 min)
3. Prueba con `limit=10` (5 min)

### Día 3: Casos Avanzados
1. Lee [GUIA_COMPLETA_ENDPOINTS_M8N.md](./GUIA_COMPLETA_ENDPOINTS_M8N.md) (20 min)
2. Implementa segmentación (15 min)
3. Configura múltiples workflows (15 min)

### Día 4: Optimización
1. Revisa [EJEMPLOS_M8N_LISTOS.md](./EJEMPLOS_M8N_LISTOS.md) - Sección Tips (10 min)
2. Ajusta horarios y filtros (10 min)
3. Monitorea métricas (10 min)

---

## ❓ Preguntas Frecuentes

### ¿Cuál es la diferencia entre minHoursAgo y startDate?

- **minHoursAgo:** Relativo a ahora (ej: hace más de 5 horas)
- **startDate:** Fecha fija (ej: desde 2026-02-01)

Usa `minHoursAgo` para campañas recurrentes, `startDate` para análisis histórico.

---

### ¿Cómo evito spamear usuarios?

Usa `minHoursAgo=5` para no contactar usuarios que abandonaron hace poco.

---

### ¿Puedo combinar filtros?

Sí, puedes combinar cualquier filtro:
```
minHoursAgo=5&maxHoursAgo=48&unique_users=true&limit=500
```

---

### ¿Qué hago si email o phone son null?

Verifica en m8n antes de enviar:
```yaml
if: "${item.email != null && item.email != ''"
```

---

### ¿Cuál es el límite de registros?

Máximo 1000 registros por request. Usa `limit` y `offset` para paginar.

---

## 🆘 Troubleshooting

| Problema | Solución |
|----------|----------|
| 403 Unauthorized | Verificar API Key |
| 400 Bad Request | Revisar sintaxis de parámetros |
| No se envían mensajes | Verificar que email/phone no sean null |
| Usuarios duplicados | Usar `unique_users=true` |
| Spam a usuarios recientes | Usar `minHoursAgo=5` |
| Rate limiting | Reducir `limit` o aumentar intervalo |

---

## 📞 Soporte

Para preguntas o problemas:
- Email: support@rybbit.io
- Documentación: https://docs.rybbit.io
- API Reference: https://api-docs.rybbit.io

---

## 📝 Notas Importantes

1. **Todos los endpoints requieren API Key válida**
2. **Los timestamps están en UTC**
3. **Email y phone pueden ser null**
4. **Máximo 1000 registros por request**
5. **Usa `unique_users=true` para evitar duplicados**
6. **Usa `minHoursAgo=5` para no spamear**
7. **Combina filtros para segmentación precisa**

---

## 🔗 Mapa de Documentación

```
INDICE_DOCUMENTACION_M8N.md (TÚ ESTÁS AQUÍ)
├── REFERENCIA_RAPIDA_ENDPOINTS.md ⭐ (Comienza aquí)
├── EJEMPLOS_M8N_LISTOS.md ⭐ (Workflows listos)
├── GUIA_COMPLETA_ENDPOINTS_M8N.md (Detallado)
├── ABANDONMENT_DATA_ENDPOINT.md (Técnico)
└── RYBBIT_FILTRADO_EMAIL_PHONE.md (Técnico)
```

---

**Última actualización:** 2026-03-26
**Versión:** 1.0
