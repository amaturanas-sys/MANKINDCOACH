# Empaquetado nativo — Android y Windows

La **app del coach** es 100% local (datos en `localStorage`, sin backend). Se
empaqueta envolviendo el build web (`dist/`) en un contenedor nativo. La landing
pública NO se empaqueta (es un proyecto aparte que va a Vercel).

---

## 📱 Android — Capacitor (ya configurado)

El proyecto Android ya está generado en `android/` y listo para abrirse en
Android Studio. Solo necesitas el toolchain de Android en tu equipo.

### Requisitos (una vez)
- **Node.js 20+**
- **Android Studio** (incluye el Android SDK y un JDK)
- Un emulador o un dispositivo Android con depuración USB activada

### Compilar / ejecutar
```bash
npm install --legacy-peer-deps     # dependencias web + Capacitor
npm run cap:android                # build web + sync + abre Android Studio
```
`npm run cap:android` ejecuta: `vite build` → `cap sync android` → `cap open android`.
En Android Studio: **Run ▶** para instalar en el dispositivo/emulador, o
**Build → Generate Signed Bundle / APK** para producir el **APK/AAB** distribuible.

> Cada vez que cambies el código web, vuelve a correr `npm run cap:sync` (o
> `npm run cap:android`) para que el contenedor nativo tome el `dist/` nuevo.

### Si `android/` no existiera (regenerar)
```bash
npm run build
npm run cap:add:android   # = cap add android
```

### Icono y splash
Coloca un PNG grande (≥1024×1024) y genera todos los tamaños con:
```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```

### Notas
- **Datos:** viven en el `localStorage` del WebView del dispositivo. No se
  sincronizan entre equipos automáticamente → usa **Datos & Respaldos →
  Descargar/Restaurar respaldo** (JSON) para mover datos.
- `appId`: `cl.mankindfactory.workspace` · `appName`: `MankindFactory`
  (editable en `capacitor.config.ts`).
- El arrastre del calendario ya es **táctil** (dnd-kit) → conviene validarlo en
  el dispositivo real.
- (Opcional) iOS: `npm i @capacitor/ios && npx cap add ios` (requiere macOS + Xcode).

---

## 🪟 Windows — Tauri (recomendado)

Para Windows, **Tauri** envuelve el mismo `dist/` en un binario nativo ligero
(sin necesidad de hospedar nada, ideal para el modelo local-first). Electron es
una alternativa más pesada.

### Requisitos (una vez)
- **Node.js 20+**
- **Rust** (https://rustup.rs)
- Dependencias de build de Windows: **Microsoft C++ Build Tools** y
  **WebView2** (preinstalado en Windows 10/11 recientes)

### Puesta en marcha
```bash
npm install -D @tauri-apps/cli
npx tauri init
```
Responde al asistente:
- **Web assets** (`frontendDist` / "dist"): `../dist`
- **Dev server URL**: `http://localhost:5247`
- **Before build command**: `npm run build`
- **Before dev command**: `npm run dev`

Esto crea `src-tauri/`. Luego:
```bash
npx tauri dev     # ventana de escritorio en desarrollo
npx tauri build   # genera el instalador .msi / .exe en src-tauri/target/release/bundle/
```

Sugerencia: añade a `package.json`:
```jsonc
"scripts": {
  "tauri": "tauri",
  "desktop:dev": "tauri dev",
  "desktop:build": "tauri build"
}
```

> Alternativa sin Rust: **PWABuilder** (https://www.pwabuilder.com) puede generar
> un paquete **MSIX** desde la PWA, pero requiere que la app esté **publicada en
> una URL**. Como la app del coach es local, Tauri encaja mejor.

---

## Resumen

| Plataforma | Herramienta | Estado | Salida |
|---|---|---|---|
| Android | Capacitor | **Configurado** (`android/`) | APK / AAB (Android Studio) |
| Windows | Tauri | Documentado (1 comando de init) | `.msi` / `.exe` |
| iOS | Capacitor | Opcional (requiere macOS) | `.ipa` (Xcode) |
| Web/PWA | Vite + manifest + SW | Ya funciona | Instalable desde el navegador |
