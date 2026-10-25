# MyC Muebles — Calculadora inteligente de amoblamientos

PWA responsiva en español para armar un despiece, validarlo manualmente, importar precios desde Excel/CSV y compartir una cotización por WhatsApp.

La app guarda en IndexedDB el despiece, las medidas, el margen y la lista de precios. Migra automáticamente la lista existente desde `localStorage`. El almacenamiento pertenece al navegador y dispositivo donde se usa; no hay sincronización entre dispositivos ni datos enviados a una base remota. Las fotos seleccionadas y el teléfono de WhatsApp no se guardan.

## Estructura

```text
src/
  App.jsx                 Flujo de proyecto, edición y presupuesto
  styles.css              Interfaz adaptable a móvil y escritorio
  branding.css            Marca MyC Muebles
  lib/cutlist.js          Generador de piezas y fórmulas de costos
  lib/pricing.js          Importador XLSX/CSV
  lib/storage.js          Persistencia local en IndexedDB
  lib/vision.js           Prompt y cliente del servicio de visión
public/
  manifest.json           Metadatos e iconos para instalación Android
  icons/                  PNG 192, 512 y maskable 512
  sw.js                   Caché offline y actualización de la PWA
```

## Ejecutar en computadora

1. Instalar Node.js LTS y pnpm.
2. En esta carpeta ejecutar `pnpm install`.
3. Ejecutar `pnpm dev` y abrir la dirección local que muestra Vite.
4. Generar una versión de producción con `pnpm build`; se crea `dist/`.

## Usar desde el celular

Publicá el contenido de `dist/` en un hosting estático con HTTPS y fallback SPA a `index.html`. Abrí la URL pública desde Chrome para Android, tocá el menú y elegí **Instalar aplicación** o **Agregar a pantalla principal**. El service worker y la instalación requieren HTTPS, salvo localhost. Tras visitar la aplicación online una vez, el service worker guarda la interfaz y sus archivos compilados para abrirla sin conexión.

La persistencia local no equivale a una copia de seguridad: si se borran los datos del sitio o se cambia de navegador/teléfono, no hay recuperación ni sincronización. Para compartir precios y proyectos entre PC y celular haría falta una API con autenticación y una base de datos. No hay contraseñas ni claves API en el cliente. El análisis visual seguirá necesitando que se publique el endpoint seguro `POST /api/analyze`; este proyecto no incluye ese servidor.

## Lista de precios

Importá `.xlsx`, `.xls` o `.csv`. En la primera hoja, usá estas columnas (se reconocen mayúsculas y acentos):

| Nombre | Tipo | Precio | Espesor |
| --- | --- | ---: | ---: |
| Melamina blanca 18 mm | placa | 38500 | 18 |
| Canto PVC blanco | canto | 450 | 0 |
| Bisagra cazoleta | herrajes | 1200 | 0 |

La placa se valúa por m²; el tapacanto por metro lineal. El costo de herrajes se puede importar, pero para cotizar unidades hace falta agregar su cantidad al modelo de piezas/componentes. Las listas quedan guardadas en el almacenamiento local de ese navegador.

## IA de visión

`src/lib/vision.js` incluye el prompt de salida estructurada y el cliente que envía imagen y medidas a `POST /api/analyze`. Implementá ese endpoint en un servidor propio y conectalo al proveedor/modelo de visión que elijas. Mantené las credenciales en el servidor; no las incluyas en el bundle de Vite. La respuesta esperada es `{ "observations": [], "parts": [] }`. Si el endpoint no está disponible, el generador estándar crea un mueble tipo caja como punto de partida.

El cálculo estándar asume laterales a altura completa, techo y piso entre laterales (ancho menos dos espesores) y estantes a ancho interior. Fondos, frentes, uniones y holguras dependen del diseño real: confirmalos en la tabla antes de aprobar. La IA produce sugerencias; nunca se costea sin aprobación humana.
