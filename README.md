# MatuAnalytics

Plataforma SaaS de analítica web en tiempo real. Monitorea visitantes, páginas vistas y usuarios activos al instante.

## Stack

- **Frontend:** Vue 3, TypeScript, TailwindCSS, Pinia, Vue Router, Socket.IO Client, Lucide Icons
- **Backend:** Node.js, Express, Socket.IO, Firebase Admin SDK (con fallback JSON local)
- **Base de datos:** Firebase Realtime Database

## Inicio rápido

### 1. Instalar dependencias

```bash
npm install
cd server && npm install && cd ..
npm install concurrently
```

### 2. Configurar backend

```bash
cp server/.env.example server/.env
```

### 3. Ejecutar en desarrollo

```bash
npm run dev:all
```

- **Dashboard:** http://localhost:5173
- **API:** http://localhost:3001
- **Tracker:** http://localhost:3001/tracker.js

### Credenciales por defecto

- Email: `admin@matuanalytics.com`
- Contraseña: `admin123`

## Uso del tracker

Al crear un proyecto obtienes un Tracking ID. Instala el script en tu sitio:

```html
<script src="http://localhost:3001/tracker.js" data-site-id="TU_TRACKING_ID"></script>
```

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/projects` | Listar proyectos |
| POST | `/api/projects` | Crear proyecto |
| POST | `/api/track` | Registrar visita |
| POST | `/api/heartbeat` | Mantener sesión activa |
| GET | `/api/dashboard/:projectId` | Estadísticas del proyecto |

## WebSocket (Socket.IO)

Eventos emitidos:

- `visitor_connected` - Nuevo visitante conectado
- `visitor_disconnected` - Visitante desconectado
- `page_view` - Nueva página vista
- `heartbeat` - Latido de sesión
- `active_users_update` - Actualización de usuarios activos

### Dashboard

```javascript
socket.emit('join_dashboard', projectId)
socket.on('active_users_update', (data) => { ... })
```

### ESP32

```javascript
socket.emit('join_esp32', projectId)
socket.on('active_users_update', (data) => {
  // { projectId, activeUsers, lastEvent }
})
```

## Firebase (proyecto: matuanalytics-37f2f)

### 1. Service Account

Coloca `serviceAccountKey.json` en la raíz del repositorio (ya configurado, en `.gitignore`).

### 2. Habilitar Firebase Authentication

En [Firebase Console → Authentication](https://console.firebase.google.com/project/matuanalytics-37f2f/authentication):

1. **Método de acceso** → **Correo electrónico/Contraseña** → **Habilitar** → Guardar
2. Los usuarios registrados en la app aparecerán en la pestaña **Usuarios**

La autenticación usa **Firebase Auth** (registro/login en el frontend). El backend verifica el token ID de Firebase.

### 3. Crear Realtime Database

En [Firebase Console](https://console.firebase.google.com/project/matuanalytics-37f2f):

1. **Build → Realtime Database → Create Database**
2. Elige región y modo de prueba (luego bloquea escritura pública)
3. Copia la URL que aparece (ej. `https://matuanalytics-37f2f-default-rtdb.firebaseio.com`)
4. Pégala en `server/.env` como `FIREBASE_DATABASE_URL`

### 4. Reglas de seguridad

El backend usa Admin SDK; los clientes no escriben directo a RTDB:

```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

### 5. Reiniciar el servidor

```bash
cd server && npm run dev
```

Deberías ver: `Connected to Firebase Realtime Database: https://...`

Si RTDB no está creada aún, el servidor usa automáticamente una base JSON local en `server/data/`.

Estructura de datos:

```
projects/{projectId}
visitors/{projectId}/{visitorId}
sessions/{projectId}/{sessionId}
pageviews/{projectId}/{pageviewId}
realtime/{projectId}/activeUsers
users/{userId}
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Solo frontend |
| `npm run dev:server` | Solo backend |
| `npm run dev:all` | Frontend + backend |
| `npm run build` | Build frontend |
| `npm run build:server` | Build backend |
