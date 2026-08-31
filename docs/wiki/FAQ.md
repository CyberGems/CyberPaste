# Frequently Asked Questions

General questions about CyberPaste features, configuration, and troubleshooting.

---

## General

### What is CyberPaste?
CyberPaste is a free, open-source clipboard history manager for Windows. It stores everything you copy — text, code, images, files, URLs — in a local SQLite database, allowing you to recall any clip at any time.

### Is CyberPaste free?
Yes. CyberPaste is completely free and open source under the GPLv3 license. There are no paid features, ads, or tracking. You can help keep it free [here](https://github.com/CyberGems/CyberPaste#-donate).

### What Windows versions are supported?
Windows 10 (64-bit) or later, including Windows 11.

### Does CyberPaste work offline?
Yes. CyberPaste works fully offline. Only AI features and update checks require internet access.

---

## Clipboard

### What content types does CyberPaste support?
- **Text** — Plain text with formatting preservation
- **Code** — With syntax highlighting and language detection
- **HTML** — Rich text formatting preserved
- **RTF** — Rich Text Format from word processors
- **Images** — With OCR text extraction
- **URLs** — Web links with favicon display
- **Files** — File paths from Explorer

### How many clips can CyberPaste store?
Default is 300 clips. You can configure this in Settings → Clipboard → Max items.

### Does CyberPaste detect cut operations?
Yes. CyberPaste detects Ctrl+X and Shift+Delete via global keyboard hooks.

### What are ghost clips?
Ghost clips are empty or minimal clipboard events (single whitespace, empty clipboard clears). You can filter them in Settings.

### Can I edit clips after capturing them?
Yes. Right-click a clip → Edit, or press Space to open the detail panel and click Edit.

---

## Search

### How does search work?
CyberPaste uses SQLite full-text search (FTS5) for instant results. Search covers:
- Clip content
- OCR-extracted text
- Source application name

### Can I filter by content type?
Yes. Use the filter chips: All, Text, Code, Images, Links, Files.

### Is search case-insensitive?
Yes. Search is case-insensitive by default.

---

## AI Assistant

### What AI providers are supported?
- OpenAI (GPT-4, GPT-4o, GPT-3.5)
- DeepSeek
- Groq
- OpenRouter
- Ollama (local)
- Any OpenAI-compatible API

### Is my data sent to the AI provider?
Only the selected clip content is sent. No history or metadata is included.

### Can I use AI offline?
Yes, if you use Ollama or another local AI provider.

### Can I customize AI prompts?
Yes. Each action's prompt template can be edited in Settings → AI.

---

## Privacy

### Is my clipboard data synced to the cloud?
No. All data stays in a local SQLite database on your machine.

### How do I ignore sensitive applications?
Go to Settings → Privacy → Ignored Applications. Add the executable name or path.

### Can I export my data?
Yes. Settings → General → Export. Data is exported as JSON.

### How do I delete all history?
Settings → Data → Clear All History (with confirmation).

---

## Troubleshooting

### The main hotkey doesn't work
- Check if the hotkey conflicts with another application
- Verify the hotkey is set in Settings → Hotkeys
- Restart CyberPaste after changing hotkeys

### CyberPaste doesn't capture clips
- Ensure CyberPaste is running (check system tray)
- Check if the source app is in the ignored apps list
- Verify clipboard monitoring is enabled

### Clips are not showing in search
- Check if the clip type filter is set to "All"
- Verify the search query doesn't contain special characters
- Try rebuilding the search index in Settings

### High memory usage
- Reduce the max items limit in Settings
- Clear old clips
- Restart CyberPaste

### AI actions fail to connect
- Verify your API key is correct
- Check your internet connection
- For local Ollama, ensure the service is running

---

## Contributing

### How can I report a bug?
Open an issue on [GitHub Issues](https://github.com/CyberGems/CyberPaste/issues) with:
- CyberPaste version
- Windows version
- Steps to reproduce
- Expected vs actual behavior

### How can I contribute code?
1. Fork the repository
2. Create a feature branch
3. Submit a pull request
4. Describe your changes in the PR description

### How can I help with translations?
UI strings are in JSON files under `frontend/src/i18n/locales/`. Submit a PR with your translation.

### How can I donate?
See the [Donate section](https://github.com/CyberGems/CyberPaste#-donate) on the main README.
