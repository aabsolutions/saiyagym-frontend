# Progress — gymapp-web

## 2026-10-18 — Nutrición y panel de administración

### Hecho

- **Nutrición** (`/nutrition`, pestañas Calculadora · Comidas · Guías · Alimentos; cada una carga al mostrarse). El **aviso legal** está en el shell, encima de las pestañas, así que se ve en todas las pantallas (además del `disclaimer` que manda la API en cada respuesta).
  - Calculadora: objetivo, actividad (con descripción), sexo, edad, altura y peso en la unidad del usuario, prellenados desde el perfil. Solo se envía lo que difiere del perfil (sin deriva in↔cm); con el peso vacío la API usa el último registrado. Resultado: kcal objetivo (cifra principal), basal, gasto total, aviso si se ajustó al basal, reparto de macros (barra apilada de 3 con gaps y valores en texto) y qué datos salieron de la cuenta (`input.sources`).
  - Comidas: filtros por objetivo y tipo, detalle de alimentos con gramos y macros + totales. Free: las de muestra + CTA "hay N más con Premium" (`limitedByPlan` / `lockedCount` de la API).
  - Guías por objetivo (texto plano en párrafos, nunca HTML) y buscador de alimentos (debounce, categoría, etiquetas) con macros por 100 g.
- **Admin** (`/admin`, `adminGuard`; la API vuelve a validar el rol): Usuarios · Planes · Ejercicios · Tiers · Etiquetas · Plantillas · Alimentos · Comidas · Guías.
  - **Editor traducible** `<app-translatable-field>` (control de Signal Forms): una pestaña por idioma de `LANGUAGES` (agregar un idioma agrega su pestaña sin tocar código), marca las pestañas sin traducir, `es` obligatorio. `toTranslatable` omite los vacíos (lo exige `IsTranslatable`). Se usa en ejercicios, etiquetas, planes, plantillas, alimentos, comidas y guías.
  - Usuarios: búsqueda (debounce) y filtro por rol, cambio de rol inline (no el propio), asignar plan con vencimiento opcional (fin del día local).
  - Planes: tarjetas con entitlements. El editor maneja límites (número o "ilimitado" → `null`), funciones y días de estadísticas. El código es inmutable y el plan por defecto no se puede borrar.
  - Ejercicios globales: CRUD con slug sugerido desde el nombre (inmutable al editar), músculos, equipo, mecánica, categoría, etiquetas, tiers por objetivo e imagen (se sube al guardar, firma `exercise_image`). **Tiers en lote**: tabla editable por objetivo y grupo muscular, cambios pendientes resaltados, un solo `PATCH /admin/exercises/tiers`.
  - Plantillas de programa: CRUD con rutinas (clave, nombre traducible, ejercicios del catálogo por slug, series con tipo/reps/%1RM/descanso, notas, reordenar), calendario semana × día (en el orden de `firstDayOfWeek`, con "copiar semana 1") y descarga. Las reglas de progresión que ya existían se conservan. Lo que la API rechazaría se lista antes de guardar.
  - Alimentos (macros por 100 g, 1 decimal), comidas (buscador de alimentos, gramos 1–2000, marca de muestra Free) y guías: CRUD con el mismo editor traducible.
- **Compartido**: `PendingImage` (la imagen se sube al guardar; ahora también la usa el formulario de ejercicio propio), `slugify`/`slugRule` (validación + readonly), pipe `localized`, `units.kcal`/`units.g`, mensajes de validación nuevos.
- **Revisión final**:
  - `npm run i18n:check` (`scripts/i18n-check.mjs`, también corre en CI antes del build): compara TODAS las claves de cada idioma contra `es.json` (faltantes, sobrantes, vacías, placeholders distintos) y verifica que cada clave literal del código exista. Probado con un caso negativo.
  - Accesibilidad: botones de solo ícono con `aria-label`, imágenes con `alt`, controles nativos con label, tablas con `caption`, foco visible en controles propios, `h1` en los editores fuera del shell. Responsive: tablas con scroll interno, filtros que bajan de línea, pestañas paginadas.

### Verificación

- `npm run lint` ✅ · `npm run format:check` ✅ · `npm run i18n:check` ✅ (1048 claves es/en) · `npm run test:ci` 222/222 ✅ · `npm run build:gh` ✅ (inicial 546 kB; admin lazy 168 kB / 25 kB gz; nutrición 36 kB).
- Tests: editor traducible (pestañas por idioma, marca faltantes, escribe solo el idioma activo), reglas traducibles y slugs, calculadora (edad, prellenado, solo lo cambiado, lb→kg, límites), NutritionStore (carga por pestaña, filtros → página 1, debounce de búsqueda), planes (ilimitado ↔ null, código inmutable), tiers en lote (solo cambios reales, un PATCH), alimentos y comidas, plantillas (grilla ↔ DTO, semanas nuevas repiten la última, renombrar o quitar una rutina mantiene el calendario, problemas).
- **No verificado en navegador** contra la API real.

### Decisiones y gotchas

- Signal Forms no permite bindear `[readonly]`/`min` en nodos con `[formField]`: van en el schema (`readonly()`, `min()`).
- Un control propio no puede recibir `[required]` a mano (lo maneja `[formField]`): el editor traducible usa `mandatory`.
- El buscador de alimentos de la API busca por nombre, no por slug: el admin de comidas arma un índice slug → nombre cargando el catálogo una vez (es chico).
- `mat-autocomplete` necesita un `displayWith` vacío cuando la opción se agrega a una lista; si no, el input muestra "[object Object]".
- El tool Write desescapa las secuencias unicode con barra invertida: el regex de `slugify` quedó con caracteres combinantes literales y se reescribió escapado.

### Pendiente / próximo

- Probar nutrición y admin en navegador contra la API desplegada.
- App móvil (Flutter).

## 2026-10-18 — Imagen de ejercicio: se sube al guardar

### Hecho

- Antes la imagen del ejercicio propio se subía a Cloudinary apenas se elegía (si se cancelaba, quedaba huérfana). Ahora elegirla solo muestra una vista previa local (`blob:`); se sube al **guardar**, y recién con la URL se crea/actualiza el ejercicio. Si la subida falla no se guarda nada y el archivo elegido sigue ahí para reintentar; si falla el guardado después de subir, la URL subida se conserva (el reintento no la vuelve a subir).
- La firma trae `asset_folder` (backend): se envía tal cual a Cloudinary → las imágenes van a `gymapp/<env>/…` en la Media Library.
- Las fotos de progreso ya subían al confirmar el diálogo.

### Verificación

- `npm run lint` ✅ · `npm run format:check` ✅ · `npm run test:ci` 199/199 ✅ (+4: elegir no sube, guardar sube y luego crea con la URL, subida fallida no guarda, sin archivo no sube) · `npm run build:gh` ✅.

## 2026-10-18 — Dashboard, estadísticas, medidas y fotos (ngx-echarts)

### Hecho

- **Charts** (`shared/charts/`): `ngx-echarts` 22 + `echarts` 6.1 con tree-shaking y **carga diferida** (`echarts-setup.ts` vía `provideEchartsCore` en `<app-chart>`): echarts no entra al bundle inicial. `ChartTheme` expone tokens del tema resuelto, idioma y unidades; las opciones se arman en `computed` con builders puros, así cada chart sigue claro/oscuro, idioma y kg/lb (cm/in) sin recargar. `<app-chart-card>`: vista gráfico/tabla (todo valor es accesible sin hover), vacío y "refetch" a opacidad reducida. `<app-stat-range>` (30 d / 90 d / 6 m / 1 a / todo) y `<app-plan-window-note>`.
- **Paleta validada** con el validador de dataviz contra NUESTRAS superficies (`#fbf8ff` / `#10131f`): 8 slots categóricos en orden fijo (CVD ΔE ≥ 8,4, visión normal ≥ 19 en ambos modos) + rampa ordinal de 4 pasos para el heatmap. Tres slots claros quedan < 3:1 → por eso la tabla gemela es obligatoria.
- **Dashboard**: racha de semanas (cifra principal), totales de semana y mes (sesiones, volumen, series efectivas, tiempo), próximo entrenamiento del programa activo (hoy, o el primer día de entrenamiento de los 7 siguientes), últimos 5 récords y mini chart de peso corporal (90 días).
- **Estadísticas** (`/stats`, pestañas Progreso · Volumen · Constancia · Récords; cada pestaña carga al mostrarse):
  - Progreso: peso máximo + 1RM estimado (un solo eje) y volumen por sesión (chart aparte: otra escala, nunca doble eje) del ejercicio elegido (por defecto, el del récord más reciente); total de powerlifting (1RM estimado o peso levantado, escalonado por mejor marca).
  - Volumen: barras agrupadas por semana por músculo principal (series o kg), hasta 6 músculos; **cada músculo conserva su color** al agregar/quitar otros.
  - Constancia: heatmap anual (semana según `firstDayOfWeek`, bins por cuartiles del propio usuario, scroll interno en móvil) y adherencia por programa (%, completados/planificados, sesiones fuera de plan, barras por semana).
  - Récords: tabla por ejercicio con peso máximo, 1RM estimado y volumen (valor, serie y fecha) + desglose de reps por peso al expandir; búsqueda por nombre.
  - Free: pedir más de 90 días muestra el CTA (los datos siguen siendo reales: la API recorta y lo informa en `window.limitedByPlan`, que también dispara el aviso).
- **Medidas** (`/body/measurements`): selector de medida + rango y chart con tabla gemela; diálogo (Signal Forms) con fecha local, 9 medidas en la unidad del usuario (límites de la API convertidos), "al menos una medida" y notas; historial paginado con editar/eliminar. PATCH solo con lo que cambió (un valor imperial no tocado no se reenvía → sin deriva lb↔kg).
- **Fotos de progreso** (`/body/photos`, Premium para subir): subida firmada a Cloudinary con progreso y vista previa local, vista (frente/perfil/espalda), fecha y notas; galería por día; comparador antes/después con slider (input range nativo: teclado y lector de pantalla), por defecto la primera vs la última de la vista, elegibles. Tras un downgrade se siguen viendo y borrando.
- **Exportar** (Premium, en Perfil): JSON completo o CSV de sesiones / medidas, descargado como blob.
- **Backend** (mismo día): controllers de records/stats/body-metrics/progress-photos movidos a `*.controller.ts` y query de export a `*.dto.ts` → el cliente generado ya tipa esas respuestas. Se eliminó el workaround `ExerciseRecordsApi`.
- Otros: `localDate` acepta días locales `YYYY-MM-DD` sin corrimiento UTC; `browserTimeZone()` para el `tz` de stats; `.sg-table` global (cifras tabulares); `<app-upgrade-cta customMessageKey>`; CSP `img-src` + `blob:` (vista previa de la foto).

### Verificación

- `npm run lint` ✅ · `npm run format:check` ✅ · `npm run test:ci` 195/195 ✅ · `npm run build:gh` ✅ (inicial 545,9 kB; `echarts-setup` lazy 600 kB / 171 kB gz; stats 39 kB; body 36 kB).
- Tests: paleta y tooltips (nombres escapados, valor antes que nombre), rangos (medianoche LOCAL, ventana Free), builders (un eje para peso/1RM, lb, huecos de e1RM, semanas sin datos en 0, slots de músculo estables, bins por cuartiles, primer día de semana del heatmap), StatsStore (nada carga hasta mostrar la pestaña, `tz` del navegador, refetch al cambiar rango, aviso Free y `limitedByPlan`, programas ordenados y adherencia), medidas (imperial → kg/cm, PATCH mínimo, límites por unidad), próximo entrenamiento (hoy, descanso, antes de empezar, terminado), últimos récords, fotos por día local, export, `ChartCard` (tabla gemela, vacío).
- **No verificado en navegador** contra datos reales (paso 7 de dataviz pendiente: mirar colisiones de etiquetas y tamaños con sesiones reales).

### Decisiones y gotchas

- echarts pinta en canvas y no lee CSS vars: los colores van como hex por tema en `chart-palette.ts` (validados). Cambiar un hex = volver a correr el validador.
- `ng-content` dentro de `@if` deja el chart desacoplado del DOM (echarts mide 0): `ChartCard` usa `[hidden]`.
- El cliente generado devuelve Promises: en tests de stores hay que dejar resolver microtareas (`settle()`) antes de asertar.
- Export: el cliente generado parsea el body; la descarga va por `HttpClient` con `responseType: 'blob'` y el nombre de archivo lo arma la web.

### Pendiente / próximo

- Revisar los charts en navegador con datos reales (requiere sesiones: app móvil o carga por API).
- Cloudinary/SMTP en Render (sin Cloudinary, subir fotos falla con `MEDIA_NOT_CONFIGURED`).

## 2026-10-18 — Historial de sesiones

### Hecho

- **Historial** (`/history`): calendario mensual (semana según `firstDayOfWeek`, un punto por sesión con el color de su rutina, leyenda, hoy resaltado; tocar un día filtra la lista) + lista paginada con filtros desde/hasta (días LOCALES), rutina y ejercicio (autocompletado). Filtros, mes y página en la URL. Las sesiones en curso se marcan.
- **Backend** (mismo día): `GET /workouts` acepta `routineId` y `exerciseId` → filtros y paginación correctos en el servidor.
- **Detalle** (`/history/:id`): resumen (duración, volumen, series efectivas, ejercicios), valoración, notas, ejercicios con series (calentamientos y series no hechas diferenciadas), 1RM estimado por ejercicio y **récords de esta sesión** (los récords vigentes cuyo `workoutId` es esta sesión; una llamada por ejercicio).
- **Corrección posterior**: modo edición (nombre, notas, valoración, tipo/peso/reps/hecha por serie, quitar series) con volumen en vivo; guarda con `PATCH` (la lista completa, conservando ids) y avisa cuántos récords nuevos devolvió la API. Las sesiones aún en curso en el móvil son de solo lectura. Eliminar con confirmación. Cambios sin guardar protegidos (guard + `beforeunload`).
- **Series por ejercicio** (`/history/exercise/:id`, enlazada desde el detalle de sesión y de ejercicio): tabla de todas las series (fecha por sesión, tipo, peso, reps, e1RM, volumen), paginada por sesiones.
- Compartido: `set-math.ts` (Epley 1–12 reps, volumen sin calentamientos), `DurationPipe`, `<app-rating-stars>`, `<app-exercise-autocomplete>`, `ExerciseRecordsApi` (`shared/records/`), paleta de rutinas `--sg-routine-*` en `styles.scss`.

### Verificación

- `npm run lint` ✅ · `npm run format:check` ✅ · `npm run test:ci` 159/159 ✅ · `npm run build:gh` ✅ (inicial 544 kB; historial lazy 105 kB).
- Tests: filtros ↔ URL ↔ API (días locales → `[from, to)` en instantes UTC), grilla del mes según primer día, agrupación por día LOCAL, colores por rutina, store (no carga sin la URL, mes + lista, día del calendario → página 1), borrador de sesión (kg exactos sin deriva lb, conversión al editar, ids conservados, volumen sin calentamientos), schema, e1RM/volumen, tabla de series, récords de la sesión y PATCH con `newRecords`, detalle (en curso = solo lectura; corregir reps → PATCH con los kg guardados).
- **No verificado en navegador** contra datos reales (no hay sesiones hasta que exista la app móvil o se carguen por API).

### Decisiones y gotchas

- **PRs de la sesión = récords vigentes**: la API solo guarda el récord actual por tipo (con su `workoutId`) y lo recalcula al editar; un PR que después fue superado ya no aparece. Decisión del usuario frente a persistir `newRecords` por sesión en el backend.
- La web **corrige** sesiones pero no las inicia ni cronometra (SPEC). Editar una sesión en curso pelearía con la sincronización del móvil (last-write-wins): solo lectura hasta que termine.
- Pesos editados en la unidad del usuario, fijada al entrar en edición; los no tocados se reenvían con los kg exactos.
- `mat-checkbox` no integra Signal Forms (`FORM_FIELD`): se bindea con `[checked]`/`(change)`.
- Un fixture exportado desde un `*.spec.ts` hace que Vitest ejecute ese spec otra vez en cada importador: los fixtures van en `*.spec-helpers.ts`.

### Pendiente / próximo

- ~~Estadísticas (stats)~~ — hecho en la entrada de arriba.

## 2026-10-18 — Rutinas y programas

### Hecho

- **Rutinas** (`/routines`): lista activas/archivadas con duplicar, archivar/desarchivar y eliminar (confirmación; `409 ROUTINE_IN_USE` lo explica el snackbar); contador "x de 3" y `<app-upgrade-cta>` al límite (archivar libera un hueco).
- **Constructor** (`/routines/new`, `/routines/:id`): buscador lateral de ejercicios (debounce + `switchMap`; en móvil, desplegable); reordenar con CDK drag & drop (asa por ejercicio); superseries contiguas ("superserie con el siguiente" / "separar"); series objetivo (tipo, reps mín–máx, sin carga / peso / %1RM, descanso) y notas; regla de progresión por ejercicio (Premium, `*requireFeature`). Signal Forms con arrays anidados (`applyEach`, `applyWhen`): errores inline. **Cambios sin guardar**: indicador, `canDeactivate` con diálogo y `beforeunload`.
- **Programas** (`/programs`, pestañas Mis programas · Esta semana · Plantillas): lista con activar (fecha de inicio LOCAL), pausar, completar y eliminar; aviso de límite de programas activos.
- **Asistente** (`/programs/new`, `/programs/:id/edit`), 5 pasos: nombre y duración → cuadrícula semana × día (en el orden de semana del usuario; "copiar semana a todas"; semanas nuevas repiten la última) → descarga (semanas, modo, %) → progresión (Premium: reglas por ejercicio de cada rutina programada) + training maxes para ejercicios en %1RM → revisar y "Guardar borrador" / "Guardar y activar".
- **Plantillas**: galería (objetivo, nivel, semanas, días/semana, aviso si la progresión se descartará en Free), vista previa (cuadrícula + rutinas) y "Usar plantilla" (nombre + training maxes de los ejercicios en %) → `POST /program-templates/:id/copy` → asistente del programa copiado.
- **Esta semana**: los 7 días locales de la semana del programa activo (selector si hay varios), con rutina, series agrupadas y pesos objetivo calculados por la API, notas de progresión traducidas (sube X, mantén, % del máximo, descarga), semana de descarga y navegación entre semanas.
- `shared/format/local-dates.ts` (fechas `YYYY-MM-DD` locales, semanas según `firstDayOfWeek`), `unsavedChangesGuard`, `app-exercise-picker`.

### Verificación

- `npm run lint` ✅ · `npm run format:check` ✅ · `npm run test:ci` 139/139 ✅ (+38) · `npm run build:gh` ✅ (inicial 543 kB sin cambios; rutinas 34 kB y programas 140 kB lazy).
- Tests: superseries (vincular, tríos, unir grupos, separar, mover/borrar nunca deja grupos de uno o partidos), conversión kg↔lb y %1RM, regla sin tocar reenviada tal cual, schema (rango de reps, carga según modo, tope en la unidad del usuario, semanas de %1RM), constructor de punta a punta (elegir ejercicio → sin guardar → POST en kg → navegación), guard de cambios sin guardar, modelo del programa (ida y vuelta, redimensionar, copiar semana, descarga, maxes), guardado del asistente (reglas → programa → activación; activación fallida devuelve el borrador; regla rechazada no guarda el programa), semana (7 fechas locales en orden), máximos de plantillas, fechas locales.
- **No verificado en navegador**: drag & drop del constructor (mouse/touch), asistente completo, copia de plantillas y "Esta semana" contra producción.

### Decisiones y gotchas

- **Las reglas de progresión viven en las rutinas** (`RoutineExerciseDto.progression`), no en el programa: el paso "Progresión" del asistente edita las rutinas programadas y las guarda con PATCH antes que el programa. Una rutina usada en dos programas comparte reglas (la UI lo avisa).
- La API exige Premium solo si una regla **cambia** (compara JSON): una regla sin tocar se reenvía exactamente como vino, para que un usuario que bajó a Free pueda seguir editando sus rutinas.
- Unidades fijadas al abrir un editor (constructor, asistente): cambiar kg↔lb a mitad de la edición reinterpretaría los números ya escritos.
- "Esta semana" = 7 llamadas paralelas a `GET /programs/active/today?date=` (la API calcula los objetivos día a día).
- "Sin guardar" del asistente compara el body que se enviaría (no el borrador crudo): las filas vacías de training max no cuentan como cambio. `syncTrainingMaxes` devuelve la misma referencia si nada cambia (se llama desde un `effect` que también lee el borrador).
- Guardar y activar: si solo falla la activación (límite Free → diálogo de upgrade), el programa queda guardado como borrador y la página lo refleja.

### Pendiente / próximo

- Probar en navegador el constructor (drag & drop, móvil) y el asistente completo.
- Etiquetas por día del programa (`label`): se conservan pero no se editan todavía.
- Override de descarga por ejercicio (`deload` en la regla): se conserva, no se edita.
- Siguiente: historial (sesiones registradas en el móvil) y estadísticas.

## 2026-10-18 — Catálogo de ejercicios

### Hecho

- **Rutas** (`/exercises`): pestañas Lista (`''`) y Tier list (`tiers`) como rutas reales; `new`, `:id`, `:id/edit`. `ExercisesStore` y `TierBoardStore` provistos en la raíz del feature (los filtros sobreviven al ir y volver del detalle); detalle y formulario con su propio store.
- **Lista**: búsqueda con debounce de 300 ms; filtros músculo, equipo, mecánica, tier + objetivo, etiqueta, favoritos, personalizados; paginación (20/50/100) con `MatPaginatorIntl` traducido. Filtros y página **en la URL** (`replaceUrl`): links compartibles y botón atrás; los valores inválidos de la URL se descartan. `rxMethod` + `switchMap`: una respuesta vieja nunca pisa a la nueva. `goal` solo se manda junto con `tier` (la API lo exige); `sort=relevance` solo con búsqueda. Favorito optimista con rollback.
- **Chips de tier** (`app-tier-chip`): S dorado, A verde, B azul, C gris (claro/oscuro con `light-dark()`); el tier personal con borde punteado.
- **Tier list**: columnas S/A/B/C + bandeja "sin tier para este objetivo"; selector de objetivo (por defecto el del perfil) y de músculo; conmutador global/personal. En modo personal, CDK drag & drop entre columnas (la bandeja es solo origen) → `PATCH /exercises/{id}/prefs { personalTiers: { <objetivo>: tier } }` optimista con rollback (solo cambia el objetivo del tablero); botón para volver al tier global en ese objetivo (`null` + recarga).
- **Detalle**: imagen, músculos principal/secundarios, equipo/mecánica/categoría, tiers por objetivo + selector de tier personal, descripción e instrucciones, favorito, récords (mayor peso, mejor e1RM, mayor volumen, más reps por peso) e historial paginado (series de trabajo; los calentamientos no se muestran). Editar/eliminar si es propio (con confirmación).
- **Crear/editar personalizados**: Signal Forms con los límites del DTO; secundarios sin repetir el principal; texto vacío → se omite al crear y se manda `null` al editar. Imagen: firma de `POST /media/upload-signature` (`custom_exercise_image`) → subida directa multipart a Cloudinary con progreso; tamaño y formato validados antes de subir; el secreto nunca llega al cliente. **Límite del plan**: contador "x de 10", botón crear oculto y `<app-upgrade-cta>` al llegar al límite (y la API responde `PLAN_LIMIT_REACHED` → diálogo).
- `LocalDatePipe` (Intl, zona del usuario, idioma activo), `ImageUpload` reutilizable (servirá para fotos de progreso).

### Verificación

- `npm run lint` ✅ · `npm run format:check` ✅ · `npm run test:ci` 101/101 ✅ (+35) · `npm run build:gh` ✅ (inicial 542 kB raw / 139 kB; el catálogo es un chunk lazy de 238 kB).
- Tests: filtros ↔ URL ↔ API, `moveToTier` (puro), mapeo/schema del formulario, `checkImage` + subida firmada (campos firmados, sin Bearer, nada se sube si el archivo no cumple), `ExercisesStore` (no carga sin filtros de la URL, respuesta vieja descartada, página 1 al filtrar, rollback de favorito, límite), `TierBoardStore` (objetivo del perfil, no mueve en modo global, guardado + rollback), detalle (récords con body, sin récords/historial), debounce de la búsqueda con timers falsos.
- **Mutation test**: con `mergeMap` en vez de `switchMap`, el test de respuesta vieja falla.
- **No verificado en navegador**: drag & drop real (mouse/touch), subida a Cloudinary (en producción hoy devuelve `MEDIA_NOT_CONFIGURED`).

### Decisiones y gotchas

- **Tier personal por objetivo** (cambio en el backend, mismo día): `personalTier` único → `personalTiers: { hypertrophy, powerlifting }`, como el global. Se hizo antes de que exista la app móvil para no tener que versionar el contrato de sync. Tarjetas y tablero muestran el personal del objetivo visible; el detalle tiene un selector por objetivo.
- **Bug del spec del backend (récords y stats)**: `RecordsController` está en `records.module.ts` y el plugin de swagger solo infiere respuestas en `*.controller.ts` → `GET /exercises/{id}/records` (y `/records`, y los `stats/*`) sin schema; el cliente generado devuelve `void` **y descarta el body**. Se llama con `HttpClient` + `recordsControllerForExercise.PATH` y un tipo local (`exercise-records.ts`, temporal).
- `withFetch()` está deprecado en Angular 22 (fetch ya es el default) y fetch **no informa progreso de subida** → `withXhr()` (solo se desaconseja en SSR, que no usamos).
- `MatPaginatorIntl` en `app.config` metía el paginador entero en el bundle inicial (+220 kB): se provee por ruta con `providePaginatorI18n()`.
- CSP: `connect-src` suma `https://api.cloudinary.com` (destino de `uploadUrl`).
- No se bindea `[maxlength]` en inputs con `[formField]`: Signal Forms ya lo deriva de `maxLength()`.
- El preview de drag del CDK se monta en `<body>`: sus estilos van en `styles.scss`.

### Pendiente / próximo

- Backend: mover `RecordsController`/`StatsController` a archivos `*.controller.ts` (o `@ApiOkResponse`) y regenerar; Cloudinary en Render; correr `db:migrate-personal-tiers` en producción tras el deploy.
- Probar en navegador: drag & drop (incluido táctil), subida de imagen cuando Cloudinary esté configurado.
- Siguiente feature: rutinas.

## 2026-10-18 — Auth, perfil, onboarding y planes

### Hecho

- **Auth** (ya existían de la base): login, registro, verificar email, olvidé / restablecer contraseña, con validación y mensajes traducidos. Guards `authGuard`, `guestGuard`, `adminGuard`.
- **AuthStore**: suma `hasFeature(feature)`, `limit(key)`, `changePassword()` y `deleteAccount()` (además de usuario, plan, entitlements y estado de sesión).
- **Onboarding** (`/onboarding`, fuera del shell): wizard `mat-stepper` (vertical en móvil) de 3 pasos: idioma + unidades → datos físicos (nacimiento, sexo, altura) → nivel + objetivo (obligatorios). `onboardingGuard` en el shell, después de `authGuard`: perfil sin `level` o `goal` = primer login. "Omitir" queda guardado por usuario en `localStorage` (`sg.onboarding.skipped.<id>`).
- **Perfil** (`/profile`): datos personales + físicos + entrenamiento; preferencias (idioma, unidades, tema, descanso por defecto, primer día de la semana); plan actual; cambio de contraseña (confirmación coincidente; la API cierra las otras sesiones); cerrar sesión en todos los dispositivos (con confirmación); eliminar cuenta (escribir "ELIMINAR"/"DELETE" + contraseña; el diálogo sigue abierto si la contraseña es incorrecta).
- **Modelo de perfil compartido** (`shared/profile/profile-form.ts`): mapeo DTO ↔ formulario, altura en la unidad del usuario (cm/in) con los límites del API convertidos, schema reutilizado por onboarding (`requireTraining: true`) y perfil. Campos presentacionales `app-physical-fields`, `app-training-fields`, `app-preferences-fields`.
- **Gating por plan**: `*requireFeature="'progressPhotos'"` (con `; else tpl` opcional; por defecto muestra `<app-upgrade-cta>`) y `<app-upgrade-cta [feature] | [limit] [limitValue]>`. Ante `403 PLAN_FEATURE_REQUIRED` / `PLAN_LIMIT_REACHED`, `errorInterceptor` abre un diálogo de upgrade (uno a la vez) en lugar del snackbar, leyendo `details.feature` / `details.resource|limit`.
- **Planes** (`/plans`, en el menú): comparación de los planes de `GET /plans` armada desde sus entitlements (límites, ventana de estadísticas, features); el plan actual resaltado y "Próximamente" en el resto (todavía no hay pagos).

### Verificación

- `npm run lint` ✅ · `npm run format:check` ✅ · `npm run test:ci` 66/66 ✅ (+26) · `npm run build:gh` ✅ (inicial 533 kB raw / 137 kB transferidos).
- Tests nuevos: mapeo y schema del perfil (cm↔in, nulls, límites, fecha futura, training obligatorio solo en onboarding), `planRestrictionOf`, comparación de planes, `*requireFeature` (CTA, else, reacciona al cambio de plan), onboarding (detección, guard, "omitir" por usuario), errores `PLAN_*` → diálogo y no snackbar, tarjeta de cambio de contraseña (no envía si no coinciden; limpia al terminar).
- **No verificado en navegador**: onboarding, perfil, diálogos y página de planes contra la API real.

### Decisiones y gotchas

- **Signal Forms, no Reactive Forms**: el pedido decía "formularios reactivos tipados". En Angular 22 Signal Forms es la API estable (`@publicApi 22.0`), tipada de punta a punta desde el modelo y ya usada en la base. Mezclar `FormGroup` acá daría dos sistemas de formularios en la misma app.
- **Deriva de altura en imperial**: in→cm→in con 1 decimal convertía 164 cm en 164,1 cm en cada guardado. `toUpdateProfileDto` recibe el perfil guardado y, si la altura que se muestra no cambió, reenvía los cm originales.
- Onboarding pide primero idioma y unidades (el pedido listaba datos físicos primero), porque la altura se carga en la unidad elegida.
- El diálogo de eliminar cuenta inyecta `ProfileStore` (provisto en la ruta): se abre con `injector` de la página, porque `MatDialog` es root y no lo encontraría.
- `MatDialog` + diálogo de upgrade se importan lazy desde `UpgradePrompt`: el interceptor es eager y los metía en el bundle inicial (+37 kB).
- `*requireFeature` sin prefijo `app` (excepción de ESLint documentada) porque es la API pedida.
- Regla i18n de plantillas desactivada solo para hosts de test (`**/*.spec.ts/**/*.html`).

### Pendiente / próximo

- Probar onboarding / perfil / planes en el navegador contra producción.
- Usar `*requireFeature` y `<app-upgrade-cta>` en las features que lo necesitan (fotos de progreso, exportación, auto-progresión, stats completas, nutrición completa).
- Features: exercises → routines → programs → history → stats → body → nutrition → admin.

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
- **Producción** (https://aabsolutions.github.io/saiyagym-frontend/): workflow verde (build + deploy). Verificado por el usuario en navegador: login con el admin y registro de un usuario nuevo contra la API de Render, sin bloqueos de CSP.
- Deep links (`/login`, `/routines/123`) responden 404 con el contenido de `404.html` (= `index.html`): Angular arranca igual. Limitación conocida de Pages, solo afectaría SEO.

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

- Emails de verificación/reset: dependen de SMTP en el backend y de `APP_WEB_URL=https://aabsolutions.github.io/saiyagym-frontend/` en Render.
- Backend: corregir el swagger de `TierListDto.tiers` y `SyncPullResultDto.changes` (`additionalProperties: false` o sin `Record`).
- Features: exercises (lista + tier board) → routines → programs → history → stats → body → nutrition → admin.
- Mostrar la UI de plan (límites/features) según `entitlements`: los clientes solo ocultan, la API decide.
