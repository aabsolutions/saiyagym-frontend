# SaiyaGym — web (gymapp-web)

Cliente web de GymApp: **planificar y analizar** entrenamientos (las sesiones en vivo se registran en la app móvil). Angular 22 · Angular Material 3 · NgRx SignalStore · Transloco · Vitest. Se publica en GitHub Pages y consume la API de `saiyagym-backend`.

## Requisitos

- Node **≥ 24.9** y npm 11.
- La API corriendo en `http://localhost:3000` (ver el README de `saiyagym-backend`) o apuntar a otra en `src/environments/environment.development.ts`.

## Arrancar en local

```bash
npm ci
npm start            # http://localhost:4200 (usa environment.development.ts)
```

El backend tiene que permitir `http://localhost:4200` en `CORS_ORIGINS`.

## Scripts

| Script                            | Qué hace                                                                    |
| --------------------------------- | --------------------------------------------------------------------------- |
| `npm start`                       | Dev server.                                                                 |
| `npm test` / `npm run test:ci`    | Tests unitarios (Vitest), en modo watch / una sola pasada.                  |
| `npm run lint`                    | ESLint (TS + plantillas; prohíbe texto fijo en plantillas).                 |
| `npm run format` / `format:check` | Prettier.                                                                   |
| `npm run build`                   | Build de producción (`environment.ts` → API de Render).                     |
| `npm run build:gh`                | Build para GitHub Pages: base href `/saiyagym-frontend/`, CSP y `404.html`. |
| `npm run api:sync [-- <ruta>]`    | Copia `openapi.json` del backend (por defecto `../saiyagym-backend`).       |
| `npm run api:generate`            | Regenera el cliente tipado en `src/app/api` (no editar a mano).             |

Cuando cambia el contrato del backend: `npm run api:sync && npm run api:generate` y commitear ambos.

## Arquitectura

```
src/app/
  api/        generado desde openapi/openapi.json (ng-openapi-gen)
  core/       auth (SessionService, AuthStore, guards), http (interceptores),
              i18n, preferences (tema/idioma/unidades), cold-start, layout (shell)
  shared/     pipes de unidades, Signal Forms helpers, withRequestStatus(), UI
  features/   una carpeta por feature: <x>.routes.ts (lazy) + <x>.store.ts + páginas
```

- **Permisos**: la API decide siempre. Guards y ocultar UI son solo comodidad.
- **Sesión**: access token en memoria, refresh token en `localStorage`. El interceptor refresca una sola vez ante 401 y encola el resto de peticiones.
- **Errores**: la API responde `{ statusCode, code, message, details? }`; se muestran en un snackbar traducido por `code` (`errors.<CODE>` en los JSON de i18n).
- **Arranque en frío** (Render free): banner "Despertando el servidor…" y reintentos automáticos.
- **Unidades**: la API guarda solo kg y cm; `| weight` y `| length` convierten según la preferencia del usuario.

### Añadir un idioma

1. Crear `public/assets/i18n/<código>.json` con las mismas claves que `es.json` (un test lo verifica).
2. Añadir `{ code, label }` a `LANGUAGES` en `src/app/core/i18n/languages.ts`.

### Tema

Paleta M3 generada desde el uniforme de Vegeta (azul `#1E3A8A`, dorado `#F5B400`). Para regenerarla:

```bash
ng g @angular/material:theme-color --primary-color=#1E3A8A --tertiary-color=#F5B400 --neutral-color=#5F6170 --directory=src/styles/
```

## Despliegue (GitHub Pages)

`.github/workflows/deploy.yml` corre lint, format, tests y `build:gh` en cada PR y push. En `main` además publica `dist/saiyagym-frontend/browser` con `actions/deploy-pages`.

Una sola vez: en el repo, **Settings → Pages → Source: GitHub Actions**. La API tiene que incluir `https://<usuario>.github.io` en `CORS_ORIGINS` y `APP_WEB_URL=https://<usuario>.github.io/saiyagym-frontend/` para que los links de los emails abran esta web.

Si cambia la URL de la API, actualizar `src/environments/environment.ts` **y** `connect-src` en `scripts/gh-pages.mjs`.
