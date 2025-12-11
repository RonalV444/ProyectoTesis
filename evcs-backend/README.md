# EVCS Backend - Sistema de Notificaciones Electromovilidad

Backend para un sistema de gestión de estaciones de carga eléctrica **que consume datos de Steve** e **integra notificaciones push en tiempo real**.

## 🎯 Características

- ✅ **Integración con Steve**: Lee datos directamente de la BD de Steve (stevedb)
- ✅ **Polling automático**: Monitorea transacciones en tiempo real (cada 5 segundos)
- ✅ **Notificaciones Push**: Firebase Cloud Messaging (FCM) automáticas
- ✅ **Sincronización**: Detecta nuevas transacciones y cambios automáticamente
- ✅ **API REST**: Endpoints para consultar datos de Steve y eventos locales
- ✅ **Base de datos local**: Almacena eventos y logs de notificaciones

## 🏗️ Arquitectura

```
Steve (stevedb)                    EVCS Backend
  ├── charge_box          ────────>  Polling Service
  ├── transaction         ────────>  ├── Sync Service (5s interval)
  ├── connector           ────────>  ├── Notifications (FCM)
  └── user                ────────>  └── Local DB (evcs_db)
                                      ├── device_tokens
                                      ├── notifications_log
                                      └── transaction_events
```

## 🚀 Quick Start

### 1. Instalación de dependencias

```bash
npm install
```

### 2. Configuración de variables de entorno

Copiar `.env.example` a `.env` y ajustar:

```bash
cp .env.example .env
```

**Variables críticas:**

#### Base de datos primaria (notificaciones):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=evcs_db
```

#### Base de datos de Steve:
```env
STEVE_DB_HOST=localhost
STEVE_DB_USER=steve
STEVE_DB_PASSWORD=changeme
STEVE_DB_DATABASE=stevedb
```

#### Firebase y Polling:
```env
FCM_SERVER_KEY=your_fcm_server_key_here
POLLING_INTERVAL_MS=5000
```

### 3. Crear base de datos local

```bash
mysql -u root -p < src/db/schema.sql
```

### 4. Verificar conexión a Steve

Asegúrate que Steve esté ejecutándose:
```bash
# En otra terminal, inicia Steve
cd steve
./mvnw spring-boot:run -Dspring-boot.run.arguments="--profile=dev"
```

### 5. Desarrollo

```bash
npm run dev
```

El servidor escuchará en:
- 📍 API REST: `http://localhost:3000`
- 🔄 Polling: Monitoreando stevedb cada 5 segundos

### 6. Compilación

```bash
npm run build
```

### 7. Producción

```bash
npm run start
```

## 📊 Estructura del Proyecto

```
evcs-backend/
├── src/
│   ├── server.ts                      # Punto de entrada + Polling init
│   ├── api/
│   │   └── routes.ts                  # Rutas HTTP REST
│   ├── ocpp/
│   │   └── index.ts                   # Servidor OCPP 2.0.1
│   ├── services/
│   │   ├── db.ts                      # Pool de conexión evcs_db
│   │   ├── steve.ts                   # Lectura de datos de Steve 🔑
│   │   ├── sync.ts                    # Polling y sincronización 🔑
│   │   └── notifications.ts           # Servicio FCM
│   ├── config/
│   │   └── env.ts                     # Variables de entorno
│   └── db/
│       └── schema.sql                 # Esquema de evcs_db
├── dist/                              # Compilado (generado)
├── .env                               # Variables de entorno (local)
├── .env.example                       # Template de variables
├── package.json
└── tsconfig.json
```

## 📡 API Endpoints

### Status
```
GET /api/health                        # Health check
GET /api/polling/status                # Estado del polling
```

### Charge Points (desde Steve)
```
GET /api/charge-points                 # Todos los puntos de carga
GET /api/charge-points/:id             # Detalle de un punto
```

### Transactions (desde Steve)
```
GET /api/transactions?limit=100        # Últimas 100 transacciones
GET /api/charge-points/:cpId/transactions?limit=50
```

### Users (desde Steve)
```
GET /api/users                         # Todos los usuarios
GET /api/users/:idTag                  # Usuario específico
```

### Notifications (Local DB)
```
POST /api/notifications/register-token # Registrar token FCM
{
  "userId": "tag123",
  "token": "firebase_token_here",
  "deviceName": "iPhone 14"
}

POST /api/notifications/send           # Enviar notificación
{
  "title": "Carga iniciada",
  "body": "Tu sesión ha comenzado",
  "token": "firebase_token_here"
}

GET /api/notifications/logs            # Historial de notificaciones
GET /api/notifications/logs/user/:userId
```

### Events (Local DB)
```
GET /api/events/transactions           # Eventos de transacciones
```

## 🔄 Flujo de Polling

### Cada 5 segundos (configurable):

1. **Lee transacciones activas de Steve**
   ```sql
   SELECT * FROM transaction WHERE stopTimestamp IS NULL
   ```

2. **Detecta transacciones nuevas**
   - Si `transaction_pk` no está en cache → Transacción nueva
   - Envía notificación: "⚡ Carga iniciada"
   - Guarda en `transaction_events` tabla

3. **Monitorea transacciones en curso**
   - Lee valores de medidor (meter values)
   - Si hay cambio significativo → Envía notificación de progreso

4. **Detecta transacciones completadas**
   - Si desaparece del query de activas → Transacción completada
   - Calcula energía entregada
   - Envía notificación: "✅ Carga completada"
   - Guarda en `transaction_events` tabla

## 🗄️ Tablas de Steve (leídas)

| Tabla | Uso |
|-------|-----|
| `charge_box` | Puntos de carga disponibles |
| `transaction` | Transacciones (activas y completadas) |
| `connector` | Conectores de carga |
| `connector_metervalue` | Valores de energía cargada |
| `user` | Usuarios con tags RFID |

## 🗄️ Tablas Locales (evcs_db)

| Tabla | Propósito |
|-------|-----------|
| `device_tokens` | Tokens FCM de usuarios para notificaciones |
| `notifications_log` | Historial de notificaciones enviadas |
| `transaction_events` | Eventos de transacciones (START, STOP, PROGRESS) |
| `polling_status` | Estado del servicio de polling |

## 🔐 Autenticación Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Obtener Server Key (Cloud Messaging)
3. Configurar en `.env`: `FCM_SERVER_KEY=your_key_here`
4. Clientes deben registrar token con: `POST /api/notifications/register-token`

## 🛠️ Stack Tecnológico

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **BD Principal**: MySQL (evcs_db) - Local
- **BD Secundaria**: MySQL (stevedb) - Steve
- **Push Notifications**: Firebase Cloud Messaging
- **ORM/Query**: mysql2/promise

## 🐛 Troubleshooting

### "Error connecting to Steve database"
```
Verificar:
- Steve está ejecutándose
- Credenciales STEVE_DB_* son correctas
- Firewall permite conexión a puerto 3306
```

### "Polling not detecting transactions"
```
Verificar:
- STEVE_DB_DATABASE=stevedb es correcto
- Hay transacciones activas en Steve
- POLLING_INTERVAL_MS no es muy grande
- Revisar logs: grep "polling" o "POLL"
```

### "Notificaciones no llegan"
```
Verificar:
- FCM_SERVER_KEY está configurado
- Token FCM fue registrado con POST /api/notifications/register-token
- Proyecto Firebase tiene enabled Cloud Messaging
- Ver logs en /api/notifications/logs
```

## 📊 Ejemplo de uso

### 1. Registrar dispositivo
```bash
curl -X POST http://localhost:3000/api/notifications/register-token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "RFID_TAG_123",
    "token": "firebase_token_here",
    "deviceName": "Mi iPhone"
  }'
```

### 2. Ver puntos de carga
```bash
curl http://localhost:3000/api/charge-points
```

### 3. Ver transacciones activas
```bash
curl http://localhost:3000/api/transactions?limit=10
```

### 4. Ver historial de notificaciones
```bash
curl http://localhost:3000/api/notifications/logs
```

## 📝 Variables de Entorno

```env
# Server
PORT=3000                              # Puerto de la API
OCPP_PORT=9220                         # Puerto OCPP (si aplica)
NODE_ENV=development|production        # Entorno

# DB Local (notificaciones)
DB_HOST=localhost                      # Host MySQL
DB_USER=root                           # Usuario MySQL
DB_PASSWORD=root                       # Contraseña
DB_DATABASE=evcs_db                    # Base de datos

# DB Steve (lectura)
STEVE_DB_HOST=localhost                # Host de Steve
STEVE_DB_USER=steve                    # Usuario Steve
STEVE_DB_PASSWORD=changeme             # Contraseña Steve
STEVE_DB_DATABASE=stevedb              # Base de datos Steve

# Firebase
FCM_SERVER_KEY=...                     # Clave del servidor FCM

# Polling
POLLING_INTERVAL_MS=5000               # Intervalo de lectura (ms)

# Logs
LOG_LEVEL=info|debug|error             # Nivel de logging
```

## 🚨 Logging

Los logs incluyen:
- 🚀 Inicio del servidor y polling
- 🔌 Detección de nuevas transacciones
- ⚡ Eventos START/STOP de transacciones
- 📤 Notificaciones enviadas
- ❌ Errores de conexión o polling

## 📚 Referencias

- [Steve Documentation](https://github.com/steve-community/steve)
- [OCPP Specification](https://openchargealliance.org/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Express.js Documentation](https://expressjs.com/)

## 📄 Licencia

MIT

## 👨‍💻 Autor

Sistema de Notificaciones Electromovilidad
