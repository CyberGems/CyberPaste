# Privacidad — CyberPaste

CyberPaste funciona en tu PC y guarda tus datos en tu PC. **No tiene cuenta, telemetría, SDK de analítica ni anuncios.** Nunca envía tu historial del portapapeles, imágenes o ajustes a su autor ni a nadie más.

Todo lo que sabe (historial del portapapeles, imágenes o ajustes) se queda en `%APPDATA%\CyberPaste\` (`cyber_paste.db`, `settings.json`, `Backups\` e imágenes guardadas). Las claves de API de IA se protegen con DPAPI de Windows dentro de `settings.json`. El instalador del repo no configura el borrado de datos; la carpeta se conserva.

## Cuándo CyberPaste se conecta a internet

Estas son todas las conexiones que CyberPaste hace por su cuenta. Ninguna envía tu historial del portapapeles, imágenes o ajustes. Como en cualquier petición de internet, el servidor ve tu dirección IP.

| Cuándo | Dónde | Para qué | Cómo desactivarlo |
|---|---|---|---|
| Con la comprobación automática activada | `github.com` (latest.json), con notas desde `api.github.com` | Consultar una versión nueva | `auto_check_updates` (desactivado por defecto) |
| Solo cuando ejecutas una acción de IA | el endpoint del proveedor configurado (por defecto `https://api.openai.com/v1`) | Enviar el clip seleccionado y tu prompt a ese proveedor | No ejecutar acciones de IA; se admite un endpoint local como Ollama |

No se encontraron otras peticiones automáticas en el código de la app.

## Qué lee CyberPaste de tu PC

CyberPaste lee los nombres de proceso y rutas que añades a la lista de apps excluidas. Esa información se queda en pantalla. Todo lo que cambia el sistema pide confirmación antes y, cuando es posible, guarda una copia para poder deshacerlo.

## Dudas

Abre un issue: https://github.com/CyberGems/CyberPaste/issues

Para una pregunta concreta sobre privacidad, usa la [página de contacto](https://cybergems.org/contact). La declaración general de la suite está en [cybergems.org/es/privacy](https://cybergems.org/es/privacy).
