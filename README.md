# TPO 2026 — Marketplace inmobiliario

Trabajo Práctico Integrador de Aplicaciones Interactivas (UADE). Un marketplace donde las **inmobiliarias** (vendedores, con login) publican y administran sus propiedades, y los **interesados** (sin login) las buscan, consultan, piden visitas y dejan reseñas.

```text
back/    API REST: Node.js 22, Express 5, TypeScript, TypeORM, PostgreSQL, Zod, Jest
front/   Aplicación web: React 19, TypeScript, Vite, React Router
DEMO.md  Guion para recorrer todas las funcionalidades (interesado y vendedor)
```

## Requisitos

- **Node.js 22+** y npm
- **PostgreSQL 16+** (con pgAdmin o `psql` para crear la base)
- Internet para las fotos de las propiedades de prueba (salen de `picsum.photos`)

## Levantar todo desde cero

Hacen falta **dos terminales**: una para el back y otra para el front.

### 1. Crear la base de datos (una sola vez)

En pgAdmin (o `psql`):

```sql
CREATE DATABASE tpo_inmobiliario;
```

### 2. Back: variables de entorno, tablas y datos de prueba

```bash
cd back
cp .env.example .env        # en Windows (cmd): copy .env.example .env
```

Abrir `back/.env` y completar:

| Variable | Para qué sirve | Valor por defecto |
|---|---|---|
| `PORT` | Puerto de la API | `3000` |
| `DB_HOST`, `DB_PORT` | Dónde está PostgreSQL | `localhost`, `5432` |
| `DB_USER`, `DB_PASSWORD` | Usuario y contraseña de PostgreSQL | `postgres` / `postgres` — **poner los propios** |
| `DB_NAME` | Nombre de la base | `tpo_inmobiliario` |
| `JWT_SECRET` | Secreto para firmar los tokens. **Obligatorio**: la API no arranca sin él | `cambiar-por-un-secreto-largo` — poner uno propio |
| `JWT_EXPIRES_IN` | Duración de la sesión | `2h` |

Un `JWT_SECRET` se puede generar con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

```bash
npm install
npm run migration:run       # crea las tablas
npm run seed                # carga los datos de prueba
npm run dev                 # API en http://localhost:3000
```

Comprobar que anda: abrir http://localhost:3000/health → `{"status":"ok"}`. Dejar esta terminal abierta.

### 3. Front

En la otra terminal:

```bash
cd front
cp .env.example .env        # en Windows (cmd): copy .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

`front/.env` tiene una sola variable, `VITE_API_URL` (por defecto `http://localhost:3000`): solo hay que cambiarla si el back corre en otro puerto. Vite lee el `.env` al arrancar: si lo cambiás, reiniciá `npm run dev`.

### 4. Probar

Abrir **http://localhost:5173**. El listado ya tiene propiedades. Para entrar como vendedor: **Ingresar como vendedor** (`/login`) con `carla@demo.com` / `clave1234`.

## Datos de prueba (`npm run seed`)

Tres vendedores, todos con la contraseña **`clave1234`**:

| Email | Inmobiliaria | Qué tiene |
|---|---|---|
| `carla@demo.com` | Oeste Propiedades | **La cuenta de la demo**: 13 propiedades, una en cada estado (borrador, publicada, reservada, pausada, vendida, alquilada, cancelada), con consultas pendientes y respondidas, solicitudes de visita en los 5 estados, 5 reseñas, novedades leídas y sin leer, y reportes con datos de los últimos meses |
| `pedro@demo.com` | Sur Inmuebles | 3 propiedades (sirve para probar que un vendedor no toca lo de otro) |
| `valeria@demo.com` | Norte Hogar | 5 propiedades publicadas |

Entre las tres hay 12 propiedades publicadas, así que el listado público muestra **dos páginas**. Las fechas son relativas a "hoy", por eso los reportes siempre tienen datos recientes.

`npm run seed` **borra todos los datos** y los vuelve a cargar: se puede correr las veces que haga falta, por ejemplo antes de cada demo para volver al estado inicial.

## Otros comandos

| Dónde | Comando | Qué hace |
|---|---|---|
| `back/` | `npm test` | 93 tests de integración contra la base `tpo_inmobiliario_test` (crearla vacía antes; ver [`back/README.md`](back/README.md#tests)) |
| `back/` | `npm run build` / `npm start` | Compila a `dist/` y corre lo compilado |
| `front/` | `npm run build` | Chequea tipos y compila a `dist/` (tiene que terminar sin errores) |
| `back/` | `requests.http` | Todos los endpoints listos para probar con la extensión REST Client de VS Code |

## Si algo no anda

| Síntoma | Qué revisar |
|---|---|
| Las pantallas muestran un error con el botón **Reintentar**, o el listado no carga | El back tiene que estar corriendo (http://localhost:3000/health). Si usa otro puerto, ajustar `VITE_API_URL` en `front/.env` y reiniciar `npm run dev` |
| El back no arranca y habla de `JWT_SECRET` | Falta `JWT_SECRET` en `back/.env` |
| `password authentication failed` o `database "tpo_inmobiliario" does not exist` | Revisar `DB_USER`, `DB_PASSWORD` y `DB_NAME` en `back/.env` y que la base esté creada (paso 1) |
| `relation "..." does not exist` | Falta `npm run migration:run` |
| `EADDRINUSE` (puerto ocupado) | Hay otro programa en el puerto 3000 o 5173: cerrarlo o cambiar `PORT` en `back/.env` (y `VITE_API_URL` en el front) |
| Las propiedades se ven sin foto | Las fotos del seed vienen de internet (`picsum.photos`): comprobar la conexión |
| El panel te manda a `/login` sin que hayas salido | El token dura 2 horas (`JWT_EXPIRES_IN`): volver a ingresar |
| `npm run seed` no corre | Se niega a correr con `NODE_ENV=production`, para no borrar datos reales |


