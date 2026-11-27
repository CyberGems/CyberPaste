# CyberPaste Portable / CyberPaste Portable

## English

The portable package runs without an installer. Extract the ZIP to a writable folder and launch `CyberPaste.exe`.

This build keeps its own profile in a `data` folder beside the executable: clipboard history, settings, images, sounds and backups. Deleting the portable folder removes that profile. The installed build keeps using `%APPDATA%\CyberPaste` and is unaffected.

To keep your existing history in the portable build, close CyberPaste, copy the contents of `%APPDATA%\CyberPaste` into the `data` folder beside `CyberPaste.exe`, and then start the portable build.

- Do not run the portable and installed builds at the same time. They use the same clipboard monitor, global shortcut and tray integration.
- Portable builds do not enable Windows startup and do not install updates automatically.
- To update, close CyberPaste, download the next portable ZIP and replace the executable. The `data` folder stays where it is.
- Windows WebView2 must already be available on the system.

## Español

El paquete portable funciona sin instalador. Extrae el ZIP en una carpeta con permisos de escritura y ejecuta `CyberPaste.exe`.

Esta versión guarda su propio perfil en una carpeta `data` junto al ejecutable: historial del portapapeles, ajustes, imágenes, sonidos y copias de seguridad. Si borras la carpeta portable, borras ese perfil. La versión instalada sigue usando `%APPDATA%\CyberPaste` y no se ve afectada.

Para llevar tu historial actual a la versión portable, cierra CyberPaste, copia el contenido de `%APPDATA%\CyberPaste` en la carpeta `data` junto a `CyberPaste.exe` y abre después la versión portable.

- No ejecutes al mismo tiempo la versión portable y la instalada. Ambas utilizan el mismo monitor del portapapeles, atajo global e integración con la bandeja.
- La versión portable no activa el inicio con Windows ni instala actualizaciones automáticamente.
- Para actualizar, cierra CyberPaste, descarga el siguiente ZIP portable y sustituye el ejecutable. La carpeta `data` se queda donde está.
- WebView2 de Windows debe estar disponible en el equipo.
