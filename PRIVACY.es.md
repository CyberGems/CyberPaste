# Privacidad — CyberPaste

CyberPaste funciona en tu PC y guarda tus datos en tu PC. **No tiene cuenta, telemetría, SDK de analítica ni anuncios.** Las acciones de IA envían el clip seleccionado y tu prompt al proveedor configurado solo cuando las ejecutas.

El historial y las imágenes están en `%APPDATA%\CyberPaste\`; los ajustes están en `%APPDATA%\me.cybergems.cyberpaste\settings.json`. Las claves de IA están protegidas con DPAPI dentro de ese archivo. El instalador no elimina los datos de la app; la carpeta se conserva.

## Cuándo CyberPaste se conecta a internet

Estas son todas las conexiones que CyberPaste hace por su cuenta. Como en cualquier petición de internet, el servidor ve tu dirección IP.

| Cuándo | Dónde | Para qué | Cómo desactivarlo |
|---|---|---|---|
| Cuando los avisos de actualización están activados o eliges Acerca de → Buscar ahora. | `github.com` (latest.json), con notas desde `api.github.com` | Consultar una versión nueva | `auto_check_updates` (desactivado por defecto) |
| Solo cuando ejecutas una acción de IA | el endpoint del proveedor configurado (por defecto `https://api.openai.com/v1`) | Enviar el clip seleccionado y tu prompt a ese proveedor | No ejecutar acciones de IA; se admite un endpoint local como Ollama |

Estas son las únicas conexiones que la app hace por su cuenta.

## Qué lee CyberPaste de tu PC

CyberPaste lee los nombres de proceso y rutas que añades a la lista de apps excluidas. Esa información se queda en pantalla. Todo lo que cambia el sistema pide confirmación antes y, cuando es posible, guarda una copia para poder deshacerlo.

## Dudas

Abre un issue: https://github.com/CyberGems/CyberPaste/issues

Para una pregunta concreta sobre privacidad, usa la [página de contacto](https://cybergems.org/contact). La declaración general de la suite está en [cybergems.org/es/privacy](https://cybergems.org/es/privacy).
