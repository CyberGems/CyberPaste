# Privacy — CyberPaste

CyberPaste runs on your PC and keeps your data on your PC. It has **no account, no telemetry, no analytics SDK and no ads**. AI actions send the selected clip and your prompt to your configured provider only when you run them.

Clipboard history and images live under `%APPDATA%\CyberPaste\`; settings live at `%APPDATA%\me.cybergems.cyberpaste\settings.json`. AI keys are DPAPI-protected inside that settings file. The installer does not remove app data; the data folder is kept.

## When CyberPaste goes online

These are all the connections CyberPaste makes by itself. Like any request on the internet, the server sees your IP address.

| When | Where | What for | How to turn it off |
|---|---|---|---|
| When update notifications are enabled or you choose About → Check Now. | `github.com` (latest.json), with release notes from `api.github.com` | Check for a newer version | `auto_check_updates` (off by default) |
| Only when you run an AI action | your configured provider endpoint (default `https://api.openai.com/v1`) | Send the selected clip and your prompt to that provider | Do not run an AI action; a local endpoint such as Ollama is supported |

These are the only connections the app makes on its own.

## What CyberPaste reads on your PC

CyberPaste reads the process names and paths you add to the excluded-app list. That information stays on your screen. Anything that changes the system asks for confirmation first and, where possible, is backed up so it can be undone.

## Questions

Open an issue: https://github.com/CyberGems/CyberPaste/issues

For a privacy-specific question, use the [contact page](https://cybergems.org/contact). The suite-wide statement is at [cybergems.org/privacy](https://cybergems.org/privacy).
