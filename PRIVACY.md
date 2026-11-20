# Privacy — CyberPaste

CyberPaste runs on your PC and keeps your data on your PC. It has **no account, no telemetry, no analytics SDK and no ads**. It never sends your clipboard history, images or settings to its author or to anyone else.

Everything it knows (clipboard history, images or settings) stays in `%APPDATA%\CyberPaste\` (`cyber_paste.db`, `settings.json`, `Backups\` and saved images). AI API keys are protected with Windows DPAPI inside `settings.json`. The repo's installer does not configure app-data deletion; the data folder is kept.

## When CyberPaste goes online

These are all the connections CyberPaste makes by itself. None of them sends your clipboard history, images or settings. Like any request on the internet, the server sees your IP address.

| When | Where | What for | How to turn it off |
|---|---|---|---|
| When the automatic check is enabled | `github.com` (latest.json), with release notes from `api.github.com` | Check for a newer version | `auto_check_updates` (off by default) |
| Only when you run an AI action | your configured provider endpoint (default `https://api.openai.com/v1`) | Send the selected clip and your prompt to that provider | Do not run an AI action; a local endpoint such as Ollama is supported |

No other automatic request was found in the app code.

## What CyberPaste reads on your PC

CyberPaste reads the process names and paths you add to the excluded-app list. That information stays on your screen. Anything that changes the system asks for confirmation first and, where possible, is backed up so it can be undone.

## Questions

Open an issue: https://github.com/CyberGems/CyberPaste/issues

For a privacy-specific question, use the [contact page](https://cybergems.org/contact). The suite-wide statement is at [cybergems.org/privacy](https://cybergems.org/privacy).
