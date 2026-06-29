# MANKINDFACTORY MANAGER

> Plataforma de gestión y creación para **entrenador personal / médico deportivo**.
> Autor: Alberto Maturana S.

MankindFactory Manager es una herramienta digital cuyo objetivo central es **reducir el
tiempo que el profesional invierte transcribiendo información y creando documentos**. El
profesional dispone de toda la profundidad de datos (curvas, tendencias, proyecciones,
patrones en el tiempo); el paciente recibe instrucciones claras, visuales y concisas de qué
hacer y cómo.

Este repositorio contiene el **código fuente editable** (Vite + React + TypeScript) de la app
del coach y de la landing pública, más la documentación de visión, arquitectura y hoja de ruta
hacia las versiones nativas para **Android** y **Windows**.

Stack: **Vite 6 · React 19 · TypeScript · Tailwind CSS v4 · motion · lucide-react · zod ·
Vitest**. La app del coach es **100 % cliente** (datos en `localStorage`, sin backend) y
funciona offline.

---

## 🚀 Cómo ejecutar

Requiere **Node.js 20+**. Instala dependencias una vez:

```bash
npm install --legacy-peer-deps
```

| Comando | Qué hace | Puerto / salida |
|---|---|---|
| `npm run dev` | App del coach en modo desarrollo (HMR) | http://localhost:5247 |
| `npm run build` | Typecheck + build de producción de la app del coach | `dist/` |
| `npm run build:admin-only` | Snapshot **standalone** (un único HTML inlineado, abre con doble clic, offline) | `dist-admin-only/index.html` |
| `npm run dev:landing` | Landing pública en desarrollo | http://localhost:5248 |
| `npm run build:landing` | Build de la landing pública (Vercel) | `dist-landing/` |
| `npm test` | Tests (Vitest) | — |
| `npm run typecheck` | Verificación de tipos (`tsc`) | — |

> **PWA / instalación nativa:** la app sirve `manifest.json`, íconos y un service worker
> (`public/sw.js`), por lo que Chrome/Edge ofrecen **Instalar como app** en Windows y Android.

> Nota: las fuentes (Google Fonts) se cargan desde CDN cuando hay conexión; sin conexión la
> app sigue funcionando con tipografías del sistema.

### Tres "salidas" del mismo código

1. **App del coach (dev/local):** `index.html` → `src/main.tsx`. Workspace clínico completo.
2. **Snapshot admin-only:** `indexadminonly.html` → `src/main-admin-only.tsx`. Se compila a un
   único HTML autocontenido (equivale al histórico `MankindFactory_Admin_Estable.html`, hoy en
   `snapshots/`). Es el "siempre funciona" de respaldo, offline, portable en USB.
3. **Landing pública:** `index-landing.html` → `src/main-landing.tsx`. Sitio promocional
   independiente que se despliega en Vercel (ver `docs/` y `vercel.json`). No contiene datos
   clínicos.

---

## 🧩 Qué incluye el prototipo hoy

El build estable ya implementa los módulos principales (navegación por secciones):

| Sección | Contenido |
|---|---|
| **Inicio** | Panel/dashboard: ingreso estimado mensual, ingreso acumulado del año, pacientes en seguimiento, próximos controles, alertas. |
| **Pacientes** | Perfil de cliente/paciente con antecedentes mórbidos, mediciones, TDEE, curvas de progreso, historial y notas. |
| **Biblioteca MankindFactory** | Catálogo de ejercicios por equipamiento (Barra Olímpica, Poleas y Cables, Máquinas Selectorizadas, Kettlebells, Bancas, Cardio, Métodos Alternativos, Core…), con descripción e ilustración. |
| **Práctica / Planificador** | Creación de rutinas y planes: bloques de fuerza, microciclos, plantillas, planificación rápida, seguimiento post-sesión. |
| **Plantillas** | Plantillas de microciclo y plantillas de mensajes (WhatsApp / Instagram) para comunicación con pacientes. |
| **Exportación** | Exportar a CSV (pagos del mes, próximos controles), HTML imprimible, Dossier, y respaldo completo `.json` (exportar/importar). |
| **Offline / PWA** | Service worker, instalación como app y funcionamiento sin conexión. |

---

## 🎯 Visión del producto

1. **Monitorización de pacientes** — perfil con antecedentes relevantes, requerimientos de
   planificación, trayectoria de entrenamiento, alertas, y la capa comercial completa:
   pagos, bonificaciones, promociones, descuentos, sobrecargos y suscripciones.
2. **Editor de rutinas robusto / lectura simple** — el profesional edita con alto detalle
   (mide curvas, tendencias, hace proyecciones, lee patrones en el tiempo); el paciente ve una
   interfaz sencilla e interactiva con instrucciones claras.
3. **Formularios que realimentan** — los pacientes rellenan formularios de **ingreso** y
   **seguimiento** que el programa rescata y vuelca automáticamente a la ficha del tratante,
   eliminando la transcripción manual.
4. **Producción de rutinas drag & drop** — manipulación tipo arrastrar-y-soltar sobre un
   calendario para dar agilidad al profesional.
5. **Documentos del paciente visuales** — calendario sencillo con cada rutina desglosada y
   los movimientos descritos e ilustrados.
6. **Multiplataforma** — nativo en **Android** y **Windows**, con acceso desde cualquier lugar.

---

## 🗺️ Hoja de ruta hacia versión nativa

El prototipo es ya una PWA instalable. La evolución sugerida hacia nativo real:

- **Fase 0 — Baseline (este commit):** prototipo estable + PWA (manifest + íconos) + docs.
- **Fase 1 — Código fuente editable:** reconstruir el proyecto fuente (Vite + React + TS) a
  partir del cual se generó este build, para poder iterar los módulos.
- **Fase 2 — Persistencia y acceso remoto:** mover de `localStorage` a una capa de datos
  sincronizable (backend / base de datos) para "acceso desde cualquier lugar" y multi-dispositivo.
- **Fase 3 — Empaquetado nativo:**
  - **Android:** envolver con [Capacitor](https://capacitorjs.com/) (APK/AAB para Play Store o
    distribución directa).
  - **Windows:** envolver con [Tauri](https://tauri.app/) o empaquetar la PWA vía
    `PWABuilder` (MSIX).
- **Fase 4 — Calendario drag & drop y formularios públicos:** completar la planificación por
  arrastre y los formularios de ingreso/seguimiento de cara al paciente.

Detalle técnico en [`docs/PROTOTYPE.md`](docs/PROTOTYPE.md).

---

## 📁 Estructura del repositorio

```
.
├── index.html                  # Entry app del coach (dev) → src/main.tsx
├── indexadminonly.html         # Entry snapshot admin-only → src/main-admin-only.tsx
├── index-landing.html          # Entry landing pública → src/main-landing.tsx
├── package.json
├── vite.config.ts              # Config app del coach (puerto 5247)
├── vite.config.admin-only.ts   # Build single-file standalone (dist-admin-only/)
├── vite.config.landing.ts      # Build landing (dist-landing/, puerto dev 5248)
├── vitest.config.ts            # Config de tests
├── tsconfig*.json              # TypeScript (app + node)
├── vercel.json                 # Deploy de la landing en Vercel
├── public/                     # Assets servidos en "/": manifest.json, sw.js, icons/
├── src/
│   ├── App.tsx                 # Componente raíz (navegación de 3 niveles)
│   ├── main.tsx                # Entry app del coach
│   ├── main-admin-only.tsx     # Entry admin-only
│   ├── main-landing.tsx        # Entry landing
│   ├── types.ts                # Modelo de datos (dominio)
│   ├── constants.ts            # Datos semilla + cálculos médicos
│   ├── index.css               # Tailwind v4 + tokens de tema
│   ├── components/             # 32 componentes de UI
│   ├── lib/                    # storage, exporters, nsca, schemas, pwa, etc.
│   └── data/                   # nsca-exercises.json, endurance-exercises.json
├── snapshots/
│   └── MankindFactory_Admin_Estable.html   # Snapshot histórico compilado (referencia)
├── docs/
│   └── PROTOTYPE.md            # Análisis técnico y notas de arquitectura
├── .gitignore
└── README.md
```

---

## ⚠️ Notas

- La app del coach es **local-only**: los datos viven en el navegador (`localStorage`). Usa
  **Datos & Respaldos → Descargar respaldo (.json)** para respaldar antes de limpiar el
  almacenamiento o cambiar de equipo (no hay sincronización automática entre dispositivos).
- La **landing pública** es un proyecto desacoplado (Vercel) y **no contiene datos clínicos**.
- `snapshots/MankindFactory_Admin_Estable.html` es un **artefacto compilado** histórico que se
  conserva como referencia/respaldo; el snapshot reproducible se regenera con
  `npm run build:admin-only`.
- La configuración de build (`package.json`, `vite.config.*`, `tsconfig*`, `public/`) fue
  **reconstruida** a partir del código fuente y validada (typecheck + 47 tests + los 3 builds).
  Si tienes los archivos originales, pueden reemplazarse para conservar versiones exactas.
