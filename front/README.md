# Frontend — Marketplace inmobiliario

React 19 + TypeScript + Vite. Se conecta a la API del `back/` (por defecto en `http://localhost:3000`).
Para levantar **todo el proyecto desde cero**, seguir el [README de la raíz](../README.md).

## Puesta en marcha

Con el back ya corriendo (`cd back && npm run dev`):

```bash
cd front
cp .env.example .env      # en Windows (cmd): copy .env.example .env
npm install
npm run dev
```

Se abre en **http://localhost:5173**.

| Variable (`front/.env`) | Para qué sirve | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | URL de la API del back | `http://localhost:3000` |

Vite lee el `.env` solo al arrancar: si lo cambiás, reiniciá `npm run dev`. La URL aparece en un único lugar del código (`src/api/config.ts`).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 5173) |
| `npm run build` | Chequea los tipos (`tsc -b`) y compila a `dist/` |
| `npm run preview` | Sirve lo compilado, para probar el build |

## Rutas

| URL | Pantalla | Layout |
|---|---|---|
| `/` | Listado de propiedades: filtros, orden y paginado en la URL (`?q=` lo llena el buscador del header) | público |
| `/propiedades/:id` | Detalle: galería, datos, consultas (con respuesta) y pedido de visita | público |
| `/inmobiliarias/:id` | Sitio de la inmobiliaria: propiedades publicadas y reseñas | público |
| `/login`, `/registro` | Acceso del vendedor | público |
| `/panel/propiedades` | Mis propiedades: filtro por estado, ciclo de vida, historial | panel (requiere sesión) |
| `/panel/propiedades/nueva`, `/panel/propiedades/:id/editar` | Alta y edición de una propiedad | panel |
| `/panel/inmobiliaria` | Datos de mi inmobiliaria y eliminarla | panel |
| `/panel/visitas` | Solicitudes de visita agrupadas por propiedad | panel |
| `/panel/consultas` | Consultas recibidas: responder en la misma tarjeta | panel |
| `/panel/actividad` | Feed de novedades (el contador del menú se actualiza solo cada 10 s) | panel |
| `/panel/reportes` | Propiedades por estado, publicaciones por mes y tiempo promedio en el mercado | panel |
| cualquier otra | 404 | público (o panel, si empieza con `/panel/`) |

Sin sesión, `/panel/...` redirige a `/login` y, después de ingresar, vuelve a la URL que se quería abrir.

## Cómo está organizado

```text
src/
  api/         Cliente de la API: URL base, fetch con JWT, errores y tipos
  services/    Una función por endpoint, agrupadas por recurso
  auth/        AuthContext + useAuth: quién es el vendedor logueado
  hooks/       Custom hooks (useFetch, useAccion, usePaginaUrl, useNoLeidas…)
  lib/         Funciones comunes: formatear, validar, agrupar, reglas de estados
  layouts/     LayoutPublico, LayoutPanel y RequiereSesion (con <Outlet />)
  pages/       Una pantalla por ruta
  components/  Piezas reutilizables, cada una con su .module.css
  index.css    Estilos globales (variables, botones, formularios)
```


## Cómo se habla con la API

Los componentes **nunca** usan `fetch` ni arman URLs o headers: importan un servicio (`propertiesService.search(...)`) o usan `useFetch(url)`.

- El token se manda solo (`Authorization: Bearer ...`) cuando hay sesión.
- Si la API responde 401 con un token enviado, se limpia la sesión y se va a `/login`.
- Los errores llegan como `ApiError`: `error.message` es el texto del back y `error.fieldErrors` el mensaje de cada campo, para mostrarlo debajo del input. Si la API está apagada, el mensaje lo dice.
- Para cancelar un pedido en el cleanup de un `useEffect`, los servicios de lectura aceptan un `AbortSignal` como último parámetro.

