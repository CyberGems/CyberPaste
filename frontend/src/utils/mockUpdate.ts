export const MOCK_UPDATE_PREVIEW = {
  isMock: true,
  version: '1.28.0',
  currentVersion: '1.27.0',
  date: new Date().toISOString(),
  body: `### Novedades de esta versión
Esta es una previsualización interactiva de las notas de actualización para verificar la interfaz y desplazamientos.

✨ **Novedades destacadas**
- 🚀 **Previsualización en Vivo:** Inspecciona el diálogo y el botón de actualización en cualquier momento sin esperar a un release.
- 🎨 **Consistencia Visual:** El botón de la barra de título comparte dimensiones (32x32) y estilo idéntico a los demás controles.
- ⚡ **Hover Peek Optimizado:** Vista previa ampliada de clips en modo Completo con aislamiento de eventos perfeccionado.
- 🏷️ **Tooltips en Iconos de Tipo:** Ayuda contextual disponible en tiempo real en vista Compacta y Completa.
- 🏆 **Acceso Directo a Logros:** Acceso rápido y claro desde el menú de opciones.

### English Highlights
- 🚀 **Live Update Preview:** Inspect the modal and titlebar button anytime without waiting for a new GitHub release.
- 🎨 **Visual Consistency:** Title bar update button matches standard icon dimensions.
- ⚡ **Optimized Hover Peek:** Full mode card preview works smoothly with isolated mouse events.
- 🏷️ **Type Icon Tooltips:** Contextual tooltips across both Compact and Full views.`,
  downloadAndInstall: async (_cb?: any) => {},
};
