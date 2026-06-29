# MANKINDFACTORY MANAGER

> Plataforma de gestión y creación para **entrenador personal / médico deportivo**.
> Autor: Alberto Maturana S.

MankindFactory Manager es una herramienta digital cuyo objetivo central es **reducir el
tiempo que el profesional invierte transcribiendo información y creando documentos**. El
profesional dispone de toda la profundidad de datos (curvas, tendencias, proyecciones,
patrones en el tiempo); el paciente recibe instrucciones claras, visuales y concisas de qué
hacer y cómo.

Este repositorio contiene, como punto de partida, el **prototipo funcional estable**
(`index.html`) más la documentación de visión, arquitectura y hoja de ruta hacia las versiones
nativas para **Android** y **Windows**, con acceso desde cualquier lugar.

---

## 🚀 Cómo ejecutar el prototipo

El prototipo es una aplicación **100 % cliente** (React compilado a un único HTML, sin
backend). Todos los datos se guardan en `localStorage` del navegador y funciona offline.

**Opción rápida — abrir el archivo:**

```bash
# Abre index.html en tu navegador (Chrome/Edge recomendado)
```

**Opción recomendada — servir como PWA (permite "Instalar como app"):**

```bash
# Desde la raíz del repositorio
npx serve .
# o
python3 -m http.server 8080
```

Luego abre `http://localhost:8080`. En Chrome/Edge aparecerá el botón **Instalar**
(gracias a `manifest.webmanifest` + íconos), lo que da una experiencia nativa en
**Windows** y **Android** sin tienda de aplicaciones.

> Nota: las fuentes (Google Fonts) se cargan desde CDN cuando hay conexión; sin conexión la
> app sigue funcionando con tipografías del sistema.

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
├── index.html              # Prototipo estable (React compilado, app entry / PWA)
├── manifest.webmanifest    # Manifiesto PWA → instalación nativa Android/Windows
├── icons/                  # Íconos de la app (192/512 + apple-touch)
├── docs/
│   └── PROTOTYPE.md         # Análisis técnico del prototipo y notas de arquitectura
├── .gitignore
└── README.md
```

---

## ⚠️ Notas

- `index.html` es un **artefacto compilado** (bundle de producción Vite/React minificado): es
  funcional pero **no es código fuente editable**. La Fase 1 de la hoja de ruta aborda
  recuperar/reconstruir la fuente.
- Build identificado como *admin-only* (workspace clínico privado, sin landing pública).
- Los datos viven en el navegador (`localStorage`); usa **Exportar todo (.json)** para
  respaldar antes de limpiar el almacenamiento.
