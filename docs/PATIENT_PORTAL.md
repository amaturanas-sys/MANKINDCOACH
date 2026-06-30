# Portal de pacientes (autoservicio de formularios)

Permite que **tus pacientes** se registren y suban ellos mismos sus JSON de
ingreso/seguimiento. Tú solo **compartes un enlace**; no subes nada.

## Cómo funciona

```
Paciente                                Plataforma (Supabase)            Coach
--------                                ---------------------            -----
abre tu enlace de invitación            tabla patient_submissions
?portal=paciente&c=<tuCoachId>          (RLS: cada coach ve lo suyo)
  → sign up / login                                                     comparte enlace
  → sube su JSON (ingreso/avance)  ───►  fila {coach_id, kind, data} ──► (próximo: bandeja
                                                                          de entrada + import)
```

- El portal es una **entrada independiente** de la misma app:
  `https://TU-APP.vercel.app/?portal=paciente&c=<TU_COACH_ID>`
- `c` es tu **id de coach**. Lo copias desde la app: **Datos & Respaldos →
  tarjeta de cuenta → "Enlace de invitación · portal del paciente" → Copiar**.
- Los pacientes inician sesión con su propio email/contraseña (cuentas de
  Supabase Auth, separadas de la tuya). La **seguridad por fila (RLS)** asegura
  que cada coach solo ve los envíos dirigidos a él, y cada paciente solo ve los
  suyos.

## Puesta en marcha (una vez)

1. Supabase → **SQL Editor** → ejecuta [`supabase/patient-portal.sql`](../supabase/patient-portal.sql)
   (crea la tabla `patient_submissions` + políticas RLS).
2. Authentication → Providers → Email: ten **"Confirm email" desactivado** (igual
   que para tu cuenta) para que los pacientes entren sin fricción. Si lo dejas
   activo, deberán confirmar su correo (requiere Site URL bien configurada).
3. Listo: copia tu enlace de invitación desde la app y compártelo.

## Estado y próximos pasos

- ✅ **Incremento 1 (este):** portal del paciente — registro + subida del JSON,
  que queda dirigido a su coach. El paciente ve el historial de sus envíos.
- ⏳ **Siguiente:** bandeja de entrada del coach (revisar e importar envíos a la
  ficha con un clic), **datos delgados** por paciente (baseline + último +
  resumen de trayectoria) y **descarga + purga** del histórico con recordatorio,
  para minimizar el almacenamiento en la nube.

## Notas de seguridad

- Los datos clínicos **no** se exponen en enlaces públicos: viven en una tabla
  privada con RLS. (Por eso no se usó un servicio de transferencia público.)
- Endurecimiento pendiente: distinguir rol coach/paciente para que un paciente
  no vea el shell de la app del coach (hoy los **datos** ya están protegidos por
  RLS; falta el guard de UI por rol).
