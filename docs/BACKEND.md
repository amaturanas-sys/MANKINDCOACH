# Backend de red — Supabase (login + datos en la nube)

La app del coach es **offline-first**: funciona 100% local (localStorage) sin
configurar nada. Al conectar Supabase se habilita el **login del coach** y la
**sincronización en la nube** (acceso desde cualquier dispositivo). Los pacientes
**no** inician sesión; siguen rellenando formularios.

## Arquitectura

```
┌────────────────────────────┐     login + sync (HTTPS)     ┌─────────────────────┐
│  App del coach (React)      │ ───────────────────────────► │  Supabase           │
│  - localStorage (caché)     │ ◄─────────────────────────── │  - Auth (email/pass)│
│  - sincroniza el workspace  │                              │  - Postgres + RLS   │
│    completo (JSON)          │                              │  tabla coach_workspaces
└────────────────────────────┘                              └─────────────────────┘
```

- **Sin** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → modo local-only (como antes).
- **Con** las variables → login obligatorio + sync. El snapshot **admin-only**
  (`build:admin-only`) sigue siendo siempre local (sin login), como respaldo.

## Puesta en marcha (≈10 min)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. **SQL**: Supabase → *SQL Editor* → pega y ejecuta [`supabase/schema.sql`](../supabase/schema.sql).
   Crea la tabla `coach_workspaces` y las políticas RLS (cada coach ve solo lo suyo).
3. **Variables**: *Project Settings → API* → copia `URL` y `anon public key`.
   En el proyecto: `cp .env.example .env` y rellena:
   ```
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
4. **Tu cuenta de coach**: Supabase → *Authentication → Users → Add user*
   (email + contraseña). Confírmalo (o desactiva la confirmación por email en
   *Authentication → Providers → Email* mientras pruebas).
5. `npm run dev` → ahora aparece la pantalla de login. Entra con tu cuenta.

> **Producción / nativo:** define las mismas variables en el entorno de build
> (Vercel para la web, o un `.env` antes de `npm run build` para el contenedor
> Capacitor). El binario nativo embebe la URL/clave pública (la `anon key` es
> pública por diseño; la seguridad real la da RLS).

## Modelo de datos

- Tabla `coach_workspaces`: una fila por coach (`user_id`), columna `data jsonb`
  con el workspace completo (clientes, rutinas, métricas, pagos, plantillas,
  ilustraciones, etc.) y `updated_at`.
- **RLS** activo: `auth.uid() = user_id` en select/insert/update/delete.
- La sincronización es *last-write-wins* sobre el workspace completo (simple y
  robusto para un coach). Si en el futuro hay varios dispositivos editando a la
  vez, se puede pasar a sync por colección/registro.

## Seguridad

- La `anon key` es pública (va en el cliente); **no** da acceso a datos por sí
  sola: RLS exige sesión y solo expone la fila del propio usuario.
- Nunca pongas la `service_role key` en el frontend.
- La sesión se guarda en localStorage (`mankind_auth`) y se renueva sola.
