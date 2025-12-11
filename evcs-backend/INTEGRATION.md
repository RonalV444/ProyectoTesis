# Integración EVCS Backend con Steve

## 📋 Resumen de la Arquitectura

Tu `evcs-backend` ahora está configurado para **consumir datos de Steve** usando **polling** (lectura periódica de la BD).

### Componentes principales

```
┌─────────────────────────────────────────────────────────────┐
│                         EVCS Backend                         │
│                      (Puerto 3000 - API)                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────┐         ┌──────────────────────┐    │
│  │  Polling Service  │◄────────┤   Steve Database     │    │
│  │  (sync.ts)        │  Lectura  │   (stevedb)         │    │
│  │  ┌─────────────┐  │   cada 5s │  ┌──────────────┐  │    │
│  │  │ Cache de Tx │  │           │  │ charge_box   │  │    │
│  │  └─────────────┘  │           │  │ transaction  │  │    │
│  └─────────┬─────────┘           │  │ user         │  │    │
│            │                     │  │ connector    │  │    │
│            ▼                     │  └──────────────┘  │    │
│  ┌──────────────────┐            └──────────────────────┘   │
│  │ Notifications    │                                       │
│  │ Service (FCM)    │────────────────┐                      │
│  └──────────────────┘                │                      │
│            │                         ▼                      │
│            └────────────────►┌──────────────────┐           │
│                             │ Local Database   │           │
│                             │ (evcs_db)        │           │
│                             │ ┌──────────────┐ │           │
│                             │ │device_tokens │ │           │
│                             │ │notifications │ │           │
│                             │ │transaction   │ │           │
│                             │ │events        │ │           │
│                             │ └──────────────┘ │           │
│                             └──────────────────┘           │
│                                                               │
│  ┌───────────────────────────────────────────────────┐     │
│  │         REST API Endpoints (/api/...)            │     │
│  │  • /charge-points (from Steve)                    │     │
│  │  • /transactions (from Steve)                     │     │
│  │  • /users (from Steve)                            │     │
│  │  • /notifications/* (local + FCM)                │     │
│  │  • /events/transactions (local)                  │     │
│  └───────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
                        Firebase
                        (push notif)
```

## 🔄 Flujo de Datos

### 1. Polling Automático (cada 5 segundos)

```typescript
// En sync.ts - initializePolling()

const pollingInterval = setInterval(() => {
  pollTransactions()  // Lee transacciones activas de Steve
}, 5000)
```

### 2. Detección de Cambios

```typescript
// Para cada transacción en Steve:

1️⃣ ¿Nueva transacción?
   └─> Guardar en cache
   └─> Enviar notificación: "⚡ Carga iniciada"
   └─> Guardar evento en transaction_events

2️⃣ ¿Transacción en curso?
   └─> Chequear meter values
   └─> Si +5kWh de diferencia → Notificación de progreso

3️⃣ ¿Transacción completada?
   └─> Desapareció de transacciones activas
   └─> Calcular energía total
   └─> Enviar notificación: "✅ Carga completada"
   └─> Guardar evento en transaction_events
```

### 3. Notificaciones Enviadas

```
User (Steve RFID Tag) 
    ↓
Device Token (Firebase)
    ↓
FCM Service
    ↓
App Móvil (Push Notification)
```

## 🗄️ Tablas involucradas

### De Steve (lectura):
- `charge_box` - Puntos de carga
- `transaction` - Transacciones
- `connector` - Conectores
- `connector_metervalue` - Mediciones
- `user` - Usuarios con RFID tag

### Locales (escritura):
- `device_tokens` - Tokens FCM registrados
- `notifications_log` - Historial de notificaciones
- `transaction_events` - Eventos sincronizados
- `polling_status` - Estado del servicio

## 📌 Configuración Necesaria

### 1. Base de datos local
```bash
mysql -u root -p < evcs-backend/src/db/schema.sql
```

### 2. Variables de entorno
```env
# Steve (lectura)
STEVE_DB_HOST=localhost
STEVE_DB_USER=steve
STEVE_DB_PASSWORD=changeme
STEVE_DB_DATABASE=stevedb

# Local (notificaciones)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=evcs_db

# Polling
POLLING_INTERVAL_MS=5000

# FCM
FCM_SERVER_KEY=tu_clave_firebase
```

### 3. Ejecutar ambos servidores

```bash
# Terminal 1: Steve
cd steve
./mvnw spring-boot:run -Dspring-boot.run.arguments="--profile=dev"

# Terminal 2: EVCS Backend
cd evcs-backend
npm install
npm run dev
```

## 📊 Endpoints principales

### Leer de Steve
```bash
# Puntos de carga
GET http://localhost:3000/api/charge-points

# Transacciones
GET http://localhost:3000/api/transactions

# Usuarios
GET http://localhost:3000/api/users
```

### Gestionar notificaciones
```bash
# Registrar token FCM
POST http://localhost:3000/api/notifications/register-token
{
  "userId": "RFID_TAG_123",
  "token": "firebase_token",
  "deviceName": "Mi iPhone"
}

# Ver logs
GET http://localhost:3000/api/notifications/logs
```

### Ver eventos sincronizados
```bash
# Eventos de transacciones
GET http://localhost:3000/api/events/transactions

# Estado del polling
GET http://localhost:3000/api/polling/status
```

## 🔧 Modificaciones realizadas

### Archivos creados:
- ✅ `src/services/steve.ts` - Funciones para leer Steve
- ✅ `src/services/sync.ts` - Polling y sincronización
- ✅ `src/db/schema.sql` - Tablas locales actualizadas

### Archivos modificados:
- ✅ `src/config/env.ts` - Agregadas credenciales Steve
- ✅ `src/services/db.ts` - Pool mejorado
- ✅ `src/services/notifications.ts` - Agregadas funciones para usuarios
- ✅ `src/api/routes.ts` - Rutas para datos de Steve
- ✅ `src/server.ts` - Inicialización del polling
- ✅ `.env` y `.env.example` - Variables Steve
- ✅ `package.json` - Dependencias (sin cambios)
- ✅ `README.md` - Documentación completa

## 🚨 Puntos importantes

### 1. El polling es automático
```typescript
// Se inicia en server.ts:
initializePolling()  // Inicia cada 5s
stopPolling()        // Se ejecuta en SIGINT (Ctrl+C)
```

### 2. Las notificaciones requieren tokens registrados
```bash
POST /api/notifications/register-token

# El usuario (RFID tag) debe registrar su token FCM
# Sólo entonces recibirá notificaciones
```

### 3. No se modifica Steve
```
IMPORTANTE: Tu backend SOLO LEE de Steve
No escribe nada en stevedb, solo consulta
Las notificaciones van a FCM, no a Steve
```

### 4. Cache de transacciones
```typescript
// Se mantiene en memoria:
const transactionCache = {
  "123": { transactionPk: 123, notificationSent: true, ... }
}

// Permite detectar transacciones nuevas vs existentes
```

## 📈 Diagrama de flujo completo

```
Steve iniciado
    ↓
Usuario escanea RFID en charge point
    ↓
Steve registra: transacción iniciada en BD
    ↓
Polling (cada 5s): Lee transacciones activas de Steve
    ↓
Detecta transacción nueva → No está en cache
    ↓
1. Busca usuario por idTag en Steve
2. Busca tokens FCM en device_tokens local
3. Envía notificación via FCM: "⚡ Carga iniciada"
4. Guarda evento en transaction_events local
    ↓
Usuario carga durante 30 minutos
    ↓
Polling continúa leyendo cada 5s
    ↓
Si hay cambio significativo en energía:
   └─> Envía notificación de progreso
    ↓
Usuario retira conector
    ↓
Steve registra: transacción completada (stopTimestamp)
    ↓
Polling detecta: transacción ya no está activa
    ↓
1. Busca transacción completada en Steve
2. Calcula energía entregada
3. Envía notificación: "✅ Carga completada"
4. Guarda evento en transaction_events local
5. Elimina de cache
```

## ✅ Checklist de implementación

- ✅ Conexión a stevedb configurada
- ✅ Servicio steve.ts para lectura de datos
- ✅ Servicio sync.ts para polling
- ✅ Tablas locales creadas en evcs_db
- ✅ Endpoints API implementados
- ✅ Notificaciones FCM integradas
- ✅ Eventos de transacciones logging
- ✅ README actualizado
- ✅ Variables de entorno configuradas

## 🎯 Próximos pasos (opcional)

1. **Webhooks**: Implementar webhooks desde Steve si quieres evitar polling
2. **UI Admin**: Dashboard para ver transacciones en tiempo real
3. **Alertas**: Notificaciones de anomalías (sobrecalentamiento, desconexión)
4. **Analytics**: Reportes de uso de carga
5. **Autenticación**: Proteger endpoints con JWT o API keys
