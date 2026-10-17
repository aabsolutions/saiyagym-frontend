# Progress — gymapp-web

## 2026-10-17 — Base del proyecto

### Hecho

- **Scaffold** Angular **22.2.3** (última estable, verificada en npm): standalone, zoneless (default desde v21), control flow nuevo, sin SSR, sin service worker. Convención de nombres de v22 (`shell.ts`, no `shell.component.ts`).
- **Material 3** con paleta propia generada por `ng g @angular/material:theme-color` (`src/styles/_theme-colors.scss`): uniforme de Vegeta → primario azul real `#1E3A8A`, terciario dorado saiyan `#F5B400`, neutro `#5F6170`. Claro/oscuro con `color-scheme` + `light-dark()`: `system` sin clase (decide el SO), `theme-light`/`theme-dark` en `<html>` para fijarlo. Sin Bootstrap.
- **Cliente API tipado** con ng-openapi-gen 1.1 en `src/app/api` (145 modelos, 20 servicios; devuelven `Promise`). `openapi/openapi.json` vive en el repo y el código generado se commitea (el CI no depende del backend). `npm run api:sync` copia el spec desde `../saiyagym-backend` normalizándolo; `npm run api:generate` regenera.
- **Interceptores** (orden = de afuera hacia adentro): `baseUrl` → `acceptLanguage` → `error` → `auth` → `coldStart`.
  - `auth`: Bearer en memoria; ante un 401 un único refresh (single-flight + Web Locks entre pestañas) y reintento; las peticiones que llegan durante el refresh esperan (cola). Si el refresh falla con 4xx → sesión cerrada, snackbar `SESSION_EXPIRED`, `/login?returnUrl=…`. Si falla por red, el refresh token se conserva.
  - `error`: snackbar con `errors.<code>` (interpolado con `details`), si no hay clave → `message` de la API (ya viene localizado), si no → genérico. Silencioso en 401 de rutas protegidas (habla AuthStore).
  - `coldStart`: banner "Despertando el servidor…" si una petición tarda > 3 s y el server pudo dormirse (> 10 min sin respuestas); reintenta 502/503 siempre y 0/504 solo en métodos idempotentes con backoff 1-2-4-8 s (~55 s); luego queda pendiente hasta que el usuario pulsa "Reintentar". Ping a `/health` al arrancar.
- **i18n** con Transloco 8.4: `public/assets/i18n/{es,en}.json` cargados en runtime. Añadir idioma = JSON + una fila en `core/i18n/languages.ts`. Los 46 códigos de error del backend copiados a los diccionarios (`{x}` → `{{x}}`). Regla ESLint `@angular-eslint/template/i18n` en error: ningún texto fijo en plantillas.
- **Estado** con NgRx SignalStore: `AuthStore` y `PreferencesStore` globales; un store por feature provisto en su ruta (`providers`) con el feature compartido `withRequestStatus()`.
- **Preferencias** (tema, idioma, unidades): localStorage para invitados; con sesión mandan las del servidor y cada cambio hace PATCH `/users/me`.
- **Layout**: `mat-sidenav` `side` en desktop / `over` (drawer) en handset; toolbar con idioma, tema y menú de usuario; ítem Admin solo para `role === 'admin'`. Auth en pantalla partida (hero + formulario). Estructura visual inspirada en `../plantilla`, rehecha en Material.
- **Rutas lazy**: dashboard, exercises, routines, programs, history, stats, body, nutrition, profile, admin (+ login, register, forgot-password, reset-password, verify-email en la raíz, como las genera el backend en los emails). Guards `canMatch` (no descargan el chunk si se deniega): `authGuard`, `guestGuard`, `adminGuard`.
- **Pantallas funcionales**: login, registro, olvidé/restablecer contraseña, verificación de email, perfil (nombre + preferencias). El resto es placeholder con su ruta + store.
- **Formularios** con Signal Forms (`@angular/forms/signals`, `@publicApi 22.0` = estable), integrados con `matInput`/`mat-select`.
- **Pipes** `weight` (kg → kg/lb) y `length` (cm → cm/in) según la preferencia, con formato del locale activo.
- **GitHub Pages**: `npm run build:gh` → `--base-href /saiyagym-frontend/`, `scripts/gh-pages.mjs` inyecta la CSP y copia `index.html` → `404.html`. Workflow `.github/workflows/deploy.yml`: lint, format, test y build en PR y main; deploy con `actions/deploy-pages` solo en main.
- ESLint (flat config, angular-eslint 22.6) + Prettier.

### Verificación

- `npm run lint` ✅ · `npm run format:check` ✅ · `npm run test:ci` 40/40 ✅ (Vitest) · `npm run build:gh` ✅ (inicial 525 kB raw / 132 kB transferidos).
- Tests: cola de refresh (un solo refresh con 401 concurrentes, peticiones encoladas, restore desde refresh token, fin de sesión, fallo de red conserva el token), cold-start con timers falsos (banner a los 3 s, backoff, espera al usuario, POST con status 0 no se reintenta), mapeo de errores, guards + `safeReturnUrl` (open redirect), conversiones y pipes, paridad de claves es/en, shell.
- **No verificado**: la app en un navegador real contra la API, el workflow en GitHub (el repo todavía no tiene remoto) y la CSP en GitHub Pages.

### Decisiones y gotchas

- **Refresh token en localStorage** (opción A aprobada): el access token solo en memoria. Un XSS podría robar el refresh token; lo mitigan la rotación + detección de reuse del API y la CSP (`script-src 'self'`). Una cookie httpOnly no es viable con GitHub Pages ↔ Render (cross-site, `SameSite=None`, bloqueo de cookies de terceros).
- **Bug del spec del backend**: el plugin de swagger infiere `Record<K, T>` como `additionalProperties` aunque el DTO ya declare `properties` → `items: true` (inválido en OAS 3.0, rompe ng-openapi-gen) y firmas de índice que chocan con TS strict (TS2411) en `TierListDto.tiers` y `SyncPullResultDto.changes`. Normalizado en `api:sync`; el arreglo de fondo va en el backend.
- CSP vía `<meta>` (Pages no permite headers) e inyectada solo en el build de Pages para no romper `ng serve`. `inlineCritical: false` porque el `onload` del CSS crítico quedaría bloqueado. `connect-src` duplica `environment.apiUrl`: mantenerlos sincronizados.
- `inject()` en guards async **antes** del primer `await` (después se pierde el contexto de inyección).
- Transloco deja vacíos los parámetros faltantes (`límite ()`), por eso el mapeo de errores revisa los placeholders contra el texto crudo antes de interpolar.
- `/auth/logout-all` y `/auth/verify-email/resend` requieren Bearer: el interceptor excluye una lista explícita de rutas de auth públicas, no todo `/auth/*`.
- Budget inicial subido a 600 kB de warning (el default de 500 kB es de un "hello world"); el shell es lazy para que el login no descargue sidenav/toolbar.
- `docs/SPEC.md` excluido de Prettier: tiene que quedar idéntico en los tres repos.

### Pendiente / próximo

- Crear el repo `aabsolutions/saiyagym-frontend` en GitHub y activar Pages con "GitHub Actions" como fuente.
- Probar de punta a punta contra producción (CORS ya permite `https://aabsolutions.github.io`). Los emails de verificación/reset dependen de que el backend configure SMTP.
- Backend: corregir el swagger de `TierListDto.tiers` y `SyncPullResultDto.changes` (`additionalProperties: false` o sin `Record`).
- Features: exercises (lista + tier board) → routines → programs → history → stats → body → nutrition → admin.
- Mostrar la UI de plan (límites/features) según `entitlements`: los clientes solo ocultan, la API decide.
