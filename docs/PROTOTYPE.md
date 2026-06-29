# Análisis técnico del prototipo — MankindFactory Manager

Documento de referencia sobre el artefacto `index.html` incluido en este repositorio.

## Naturaleza del artefacto

- **Tipo:** aplicación de página única (SPA) **React** compilada con **Vite**, inlineada en un
  único archivo HTML (~1.2 MB).
- **Código:** bundle de producción **minificado** → funcional pero no editable como fuente.
- **Backend:** ninguno. Es 100 % cliente.
- **Persistencia:** `localStorage` del navegador. Las imágenes (avatares, portadas, ejercicios)
  se almacenan como *data URLs* en el propio store.
- **Idioma:** español (`<html lang="es">`). Build "admin-only" (sin landing pública).
- **Autor declarado:** Alberto Maturana S.

## Dependencias externas

| Recurso | Uso | ¿Crítico? |
|---|---|---|
| Google Fonts (Inter, JetBrains Mono) | Tipografía vía CDN | No — degrada a fuentes del sistema sin conexión |
| `./icons/*.png` | Favicons / íconos PWA | Provistos en este repo |
| `./manifest.webmanifest` | Instalación PWA | Añadido en este repo |

No hay llamadas a APIs de red propias: toda la lógica y los datos son locales.

## Capacidades PWA / offline

- Registra y consulta un **Service Worker** (`navigator.serviceWorker`) para estado
  online/offline y actualizaciones.
- Tras añadir `manifest.webmanifest` + íconos, la app es **instalable** como aplicación
  independiente en escritorio (Windows) y móvil (Android) desde Chrome/Edge.
- Incluye una sección **offline** dedicada en la navegación.

## Mapa de secciones (navegación interna)

Identificadas en el bundle como `section: "..."`:

- `inicio` — panel/dashboard con métricas (ingresos, seguimiento, controles, alertas).
- `pacientes` — fichas de paciente (antecedentes, mediciones, TDEE, curvas de progreso, notas).
- `biblioteca` — Biblioteca MankindFactory: catálogo de ejercicios por equipamiento.
- `practica` — planificador/práctica: bloques de fuerza, microciclos, plantillas, planificación
  rápida, seguimiento post-sesión.
- `landing` / `offline` — estados auxiliares.

## Funcionalidades observadas

- **Pacientes:** antecedentes mórbidos (p. ej. fascitis plantar), sexo, fecha, email,
  mediciones, TDEE, curvas de progreso, estado "En seguimiento".
- **Comercial:** monto por sesión, ingreso estimado mensual, ingreso acumulado del año,
  descuentos; el modelo de datos contempla pagos.
- **Biblioteca de ejercicios:** categorías por equipamiento — Barra Olímpica, Sistema de Poleas
  y Cables, Máquinas Selectorizadas, Kettlebells, Bancas (Plana/Inclinable), Cardio (Cinta,
  Bicicleta Estática, SkiErg, Cuerda para Saltar), Plataforma de Levantamiento, Barras
  Paralelas, Métodos Alternativos, Core. Ejercicios con descripción e ilustración.
- **Planificación:** convertir a bloque de fuerza, plantillas de microciclo, plantillas
  reutilizables, planificación rápida.
- **Comunicación:** plantillas de mensajes para **WhatsApp** (`wa.me/...`) e **Instagram**.
- **Exportación / respaldo:** CSV (pagos del mes, próximos controles), HTML imprimible,
  "Exportar Dossier", y respaldo/restauración completa en `.json` (exportar/importar).

## Brechas frente a la visión (trabajo pendiente)

Funciones descritas en la visión que **aún no** se observan completas en el prototipo:

1. **Calendario drag & drop** para construir rutinas arrastrando bloques/sesiones.
2. **Formularios de ingreso/seguimiento de cara al paciente** que el paciente rellene de forma
   autónoma y que realimenten la ficha (hoy la carga parece del lado del profesional).
3. **Capa comercial completa:** bonificaciones, promociones, sobrecargos y **suscripciones**
   como entidades de primera clase (hoy se ven montos/descuentos/pagos).
4. **Sincronización multi-dispositivo / acceso remoto real** (hoy los datos son locales por
   navegador).
5. **Vista de calendario del paciente** con cada rutina desglosada y movimientos ilustrados
   como documento final compartible.

## Recomendaciones de arquitectura (hacia Fase 1+)

- **Recuperar la fuente:** localizar/reconstruir el proyecto Vite+React+TypeScript original.
  Sin la fuente, iterar sobre el bundle minificado no es viable.
- **Capa de datos:** introducir una abstracción de repositorio que hoy use `localStorage` pero
  pueda conmutar a un backend sincronizable (p. ej. SQLite local + sync, o API + Postgres).
- **Empaquetado nativo:**
  - Android → **Capacitor** (reutiliza el mismo front web).
  - Windows → **Tauri** (binario ligero) o **PWABuilder/MSIX**.
- **Compartir el mismo front** entre web, Android y Windows para mantener una sola base.
