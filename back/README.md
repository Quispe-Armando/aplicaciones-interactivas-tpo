# Backend — Marketplace inmobiliario

API REST con Node.js, Express 5, TypeScript, TypeORM, PostgreSQL y Zod.

## Puesta en marcha desde cero

Requisitos: **Node.js 22+** y **PostgreSQL 16+** (con `psql` o pgAdmin para crear la base).

1. **Crear la base de datos** (una vez), por ejemplo desde pgAdmin o `psql`:

   ```sql
   CREATE DATABASE tpo_inmobiliario;
   ```

2. **Variables de entorno**: copiar el ejemplo y completarlo.

   ```bash
   cd back
   cp .env.example .env      # en Windows (cmd): copy .env.example .env
   ```

   | Variable | Para qué sirve | Valor por defecto |
   |---|---|---|
   | `PORT` | Puerto de la API | `3000` |
   | `DB_HOST`, `DB_PORT` | Dónde está PostgreSQL | `localhost`, `5432` |
   | `DB_USER`, `DB_PASSWORD` | Usuario y contraseña de PostgreSQL | `postgres` / `postgres` |
   | `DB_NAME` | Nombre de la base | `tpo_inmobiliario` |
   | `JWT_SECRET` | Secreto para firmar los tokens. **Obligatorio**: la API no arranca sin él. Usar uno propio y largo | — |
   | `JWT_EXPIRES_IN` | Duración del token | `2h` |

   Para generar un `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

3. **Instalar dependencias y crear las tablas**:

   ```bash
   npm install
   npm run migration:run
   ```

4. **Cargar datos de prueba** (opcional pero recomendado):

   ```bash
   npm run seed
   ```

5. **Levantar la API**:

   ```bash
   npm run dev
   ```

   Queda en `http://localhost:3000`. Para comprobar que anda: `GET /health` → `{ "status": "ok" }`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | API en modo desarrollo (se reinicia al guardar) |
| `npm run build` / `npm start` | Compila a `dist/` y corre lo compilado |
| `npm run migration:run` | Aplica las migraciones pendientes |
| `npm run migration:revert` | Deshace la última migración |
| `npm run migration:generate -- src/migrations/Nombre` | Genera una migración a partir de los cambios en las entidades (ojo con el ` -- ` y el espacio) |
| `npm test` | Corre los tests automáticos contra la base `tpo_inmobiliario_test` (ver "Tests") |
| `npm run seed` | **Borra todos los datos** y carga los de prueba. Se puede correr las veces que haga falta. Se niega a correr con `NODE_ENV=production` |

`synchronize` está desactivado por diseño: las tablas se crean **solo** con migraciones.

## Datos de prueba (seed)

Tres vendedores, todos con la contraseña **`clave1234`**:

| Email | Inmobiliaria | Id | Contenido |
|---|---|---|---|
| `carla@demo.com` | Oeste Propiedades | 1 | La cuenta completa: 13 propiedades, una en cada estado |
| `pedro@demo.com` | Sur Inmuebles | 2 | 3 propiedades (para probar el 403 entre vendedores) |
| `valeria@demo.com` | Norte Hogar | 3 | 5 propiedades publicadas (con las de Carla y Pedro, el listado público llega a 12 y se ve la paginación) |

Los datos están en `src/seeds/seed.json` (se pueden editar sin tocar código) y `src/seeds/seed.ts` los carga. Es un script aparte, no una migración. El seed también carga comentarios (algunos con respuesta), solicitudes de visita en todos los estados (pendiente, confirmada, rechazada, cancelada y realizada), reseñas, el historial de estados de cada propiedad y el feed de actividad (parte leído, parte sin leer). Las fechas son relativas a "hoy", así que los reportes siempre muestran los últimos meses.

Números esperados para **Carla (agencia 1)**, para verificar los reportes a mano:

- `status-summary`: DRAFT 2, PUBLISHED 5, RESERVED 1, PAUSED 1, SOLD 2, RENTED 1, CANCELLED 1 (total 13).
- `avg-time-on-market`: `averageDays: 30`, `closedCount: 3` (45 + 30 + 15 días, dividido 3).
- `monthly`: depende de la fecha en que corras el seed.
- Reseñas: promedio 4.2 con 5 reseñas.
- Una propiedad ("Casa con pileta en Ostende") tiene una visita CONFIRMADA: no se puede editar ni cancelar (409).


## Probar la API

El archivo **`requests.http`** tiene un request por cada endpoint (los 30), con los casos de éxito y de error. Se usa con la extensión **REST Client** de VS Code: abrir el archivo y hacer clic en "Send Request" sobre cada bloque, de arriba hacia abajo. Las secciones guardan los tokens e ids de las respuestas anteriores, por eso conviene respetar el orden. Se puede correr sobre la base vacía o sobre el seed.

## Endpoints

Todas las respuestas de error tienen el formato `{ "error": "mensaje", "details": [{ "field": "...", "message": "..." }] }` (`details` solo en errores de validación). Las rutas marcadas 🔒 requieren `Authorization: Bearer <token>`, y además el recurso tiene que ser del vendedor del token (si no, 403).


**Autenticación**

| Método y ruta | |
|---|---|
| `POST /auth/register` | Crea el vendedor y su inmobiliaria |
| `POST /auth/login` | Devuelve `{ token, seller, agency }` |
| `GET /auth/me` 🔒 | Sesión actual |


**Inmobiliaria**

| Método y ruta | |
|---|---|
| `GET /agencies/:id` | Perfil público, con promedio de reseñas |
| `PUT /agencies/:id` 🔒 | Editar perfil |
| `DELETE /agencies/:id` 🔒 | Eliminar (409 si tiene propiedades publicadas o reservadas) |
| `GET /agencies/:id/properties` | Propiedades publicadas (paginado) |
| `GET /agencies/me/properties` 🔒 | Todas mis propiedades, en cualquier estado (`?status=`) |
| `GET /agencies/me/properties/:id` 🔒 | Una propiedad mía en cualquier estado, incluso borrador (la usa el formulario de edición) |
| `GET /agencies/:id/reviews` · `POST /agencies/:id/reviews` | Reseñas (públicas) |
| `GET /agencies/:id/visit-requests` 🔒 | Solicitudes de visita recibidas (`?status=`) |
| `GET /agencies/:id/activity` 🔒 | Feed de actividad (`?unread=true`) |
| `GET /agencies/:id/activity/unread-count` 🔒 | Contador de no leídas |
| `GET /agencies/:id/reports/status-summary` 🔒 | Propiedades por estado |
| `GET /agencies/:id/reports/monthly` 🔒 | Publicaciones y cierres por mes |
| `GET /agencies/:id/reports/avg-time-on-market` 🔒 | Días promedio entre publicación y venta/alquiler |

**Propiedades**

| Método y ruta | |
|---|---|
| `GET /properties` | Listado público con filtros: `type`, `operation`, `currency`, `minPrice`, `maxPrice`, `area`, `rooms`, `amenities` (separadas por coma), `q` (texto libre), `sort` (`price`, `publishedAt`, `totalArea`), `order` (`asc`/`desc`), `page`, `limit` |
| `GET /properties/:id` | Detalle con galería e inmobiliaria |
| `POST /properties` 🔒 | Crear (siempre queda en `DRAFT`) |
| `PUT /properties/:id` 🔒 | Editar (reemplazo completo) |
| `DELETE /properties/:id` 🔒 | Eliminar (solo borradores) |
| `PATCH /properties/:id/status` 🔒 | Cambiar de estado (transiciones validadas) |
| `GET /properties/:id/status-history` 🔒 | Historial de estados |
| `GET /properties/:id/comments` · `POST /properties/:id/comments` | Consultas (públicas) |
| `POST /properties/:id/visit-requests` | Pedir una visita (pública) |

**Otros**

| Método y ruta | |
|---|---|
| `GET /agencies/:id/comments` 🔒 | Consultas recibidas por todas las propiedades de la inmobiliaria (paginado, `?answered=true\|false`) |
| `PATCH /comments/:id/reply` 🔒 | Responder una consulta (una sola vez) |
| `PATCH /visit-requests/:id/status` 🔒 | Confirmar, rechazar, cancelar o marcar realizada |
| `PATCH /activity/:id/read` 🔒 | Marcar una actividad como leída |

Paginado: `page` (desde 1) y `limit` (por defecto 10, máximo 50); la respuesta trae `{ items, page, limit, total }`.

## Reglas de negocio principales

- **Estados de la propiedad**: `DRAFT → PUBLISHED → RESERVED → SOLD/RENTED`; `PUBLISHED ↔ PAUSED`; `RESERVED → PUBLISHED`; `CANCELLED` desde publicada, reservada o pausada. `SOLD` solo para ventas y `RENTED` solo para alquileres. Una transición inválida devuelve 400. Cada cambio queda en el historial.
- **Edición bloqueada** si la propiedad está vendida, alquilada o cancelada, o si tiene una visita confirmada pendiente (409). Con una visita confirmada tampoco se puede cancelar.
- **Solicitudes de visita**: `PENDING → CONFIRMED → COMPLETED`, o `REJECTED`/`CANCELLED` desde pendiente o confirmada. La fecha propuesta tiene que ser futura y venir en ISO 8601 con zona horaria.
- **Eliminar la inmobiliaria** borra también la cuenta del vendedor y todo lo que cuelga de ella (en cascada, por la base).
- **Actividad**: cada consulta, solicitud de visita, reseña y cambio de estado genera una notificación en el mismo momento (misma transacción).

## Tests

Son tests de integración con **Jest + ts-jest + supertest** (lo mismo que la Clase 6): llaman a la API real contra una base Postgres real.

**Base aislada.** Los tests usan `tpo_inmobiliario_test`, nunca la de desarrollo. `__tests__/setup-env.ts` fuerza ese nombre y, si el nombre no termina en `_test`, los tests se niegan a correr (porque vacían tablas).

Preparación (una sola vez):

1. En pgAdmin, crear una base vacía llamada `tpo_inmobiliario_test` (mismo servidor y usuario que la de desarrollo; usa `DB_HOST`, `DB_PORT`, `DB_USER` y `DB_PASSWORD` del `.env`).
2. `npm install`
3. `npm test`

No hace falta correr migraciones a mano: cada archivo de test aplica las pendientes (`runMigrations`) y arranca con las tablas vacías.

Qué cubren (carpeta `__tests__/`):

| Archivo | Qué prueba |
|---|---|
| `auth.spec.ts` | Email y nombre de fantasía únicos (409), contraseña guardada con bcrypt, login (401 con el mismo mensaje), rutas protegidas |
| `property-validation.spec.ts` | Precio > 0, superficies > 0, cubierta ≤ total, terreno sin ambientes, portada única, PUT inválido no modifica nada |
| `property-state-machine.spec.ts` | Todas las transiciones de Property y de VisitRequest (válidas e inválidas), SOLD solo venta / RENTED solo alquiler, estados finales, historial, bloqueos por estado y por visita confirmada |
| `property-search.spec.ts` | Filtros (tipo, operación, moneda, precio, zona, ambientes, amenities, texto), solo PUBLISHED, orden y paginado |
| `comments.spec.ts` | Consultas: crear y listar, responder una sola vez (409 la segunda), y el listado de consultas recibidas por inmobiliaria (`?answered=`, solo el dueño) |

**Independencia.** Cada test crea sus propios datos con nombres/emails únicos (`unique()` en `helpers.ts`) y los de búsqueda usan una zona única, así que no dependen del orden ni de lo que haya dejado otro test. Los archivos corren de a uno (`--runInBand`) y cada uno empieza con las tablas vacías.

Para usar otro nombre de base de test: variable `DB_NAME_TEST` (debe terminar en `_test`).

## Estructura

```text
src/
  app.ts         createApp(): arma Express (sin servidor ni base) para index.ts y los tests
  index.ts       Arranque: conecta la base y escucha en el puerto
  config/        DataSource, JWT y transacciones
  controllers/   Entrada HTTP: validan el body con Zod y llaman al service
  entities/      Modelo persistente (8 entidades)
  errors/        HttpError (error con status)
  middlewares/   Autenticación (requireAuth), 404 y manejo de errores
  migrations/    Cambios versionados de la base
  repositories/  Acceso a datos (TypeORM)
  routes/        Rutas HTTP (sin lógica)
  seeds/         Datos de prueba: seed.json (los datos) y seed.ts (el script que los carga)
  services/      Reglas de negocio
  validation/    Validación de body/query, ids y paginado
__tests__/       Tests de integración (Jest + supertest) y sus fixtures
requests.http    Todos los endpoints, listos para probar
```

Cada capa solo habla con la siguiente: ruta → controller → service → repository.
