# Atribuciones y referencias externas

## Referencias anatómicas — AnatomyTOOL

La app **enlaza** (no redistribuye) recursos anatómicos de **AnatomyTOOL** como
referencia de consulta en la Biblioteca de movimientos.

- **Recurso:** modelo 3D de esqueleto y atlas anatómico.
- **Autoría / equipo:** O.P. Gobée, M.C. DeRuiter, D. Jansma (Leiden UMC);
  R.L.A.W. Bleys (UMC Utrecht); A. Herrler (U. Maastricht);
  E. Vereecke (KU Leuven).
- **Licencia:** GNU GPL-3.0 — https://www.gnu.org/licenses/gpl-3.0.en.html
- **Fuente:** https://anatomytool.org/open3dmodel

### Decisión de licenciamiento (importante)

El modelo 3D está bajo **GPL-3.0**, una licencia copyleft fuerte. Incluir
(empaquetar/redistribuir) una obra derivada de material GPL-3.0 obligaría a
licenciar **toda la aplicación** bajo GPL-3.0 y a publicar su código fuente, lo
que es incompatible con la licencia actual de la app (Apache-2.0) y con un modelo
de producto comercial/propietario.

Por eso, **deliberadamente NO se empaqueta ni se redistribuye el modelo**: la app
solo **enlaza** a su ficha original en AnatomyTOOL y muestra la atribución. Enlazar
a una obra no constituye redistribución, por lo que no se activa el copyleft.

> Si en el futuro se desea **incrustar** un modelo 3D dentro de la app sin abrir el
> código, debe usarse un modelo con licencia permisiva (CC0 / CC BY / CC BY-SA),
> no GPL.

## Nota general

Los datos de la biblioteca de ejercicios (`src/data/*.json`) contienen
**descripciones técnicas originales** (biomecánica estándar) que **citan** fuentes
como NSCA ESSC; no reproducen el texto de esas obras.
