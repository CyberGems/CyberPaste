# Frequently Asked Questions

General questions about CyberPaste features, configuration, and troubleshooting.

---

## General

### What is CyberPaste?
CyberPaste is a free, open-source clipboard history manager for Windows. It stores everything you copy (text, code, images, files, URLs) in a local SQLite database, allowing you to recall any clip at any time.

Fresh empty profiles receive five mixed starter clips, including one Code example; existing clips are preserved.

### Is CyberPaste free?
Yes. CyberPaste is completely free and open source under the GPLv3 license. There are no paid features, ads, or tracking. You can help keep it free [here](https://github.com/CyberGems/CyberPaste#%EF%B8%8F-donate).

### What Windows versions are supported?
Windows 10 (64-bit) or later, including Windows 11.

### Does CyberPaste work offline?
Yes. CyberPaste works fully offline. Only AI features and update checks require internet access.

---

## Clipboard

### What content types does CyberPaste support?
- **Text** — Plain text with formatting preservation
- **Code** — With syntax highlighting and language detection; rich HTML content is preserved and stored here
- **Rich text (RTF)** — Rich Text Format from word processors, cleaned to plain text
- **Images** — With OCR text extraction
- **URLs** — Web links
- **Files** — File paths from Explorer

### How many clips can CyberPaste store?
Default is 300 clips. Configure it with the **History limit** slider in Settings → Clipboard (50 – 1000, step 50). The same tab has **Auto-delete history**, which prunes older unpinned clips when enabled (disabled by default).

### Does CyberPaste detect cut operations?
Yes. CyberPaste detects Ctrl+X and Shift+Delete via global keyboard hooks.

### What does automatic clipboard noise filtering remove?
CyberPaste discards empty clipboard-clear events, whitespace-only text and RTF payloads that contain formatting data but no meaningful content. This check happens before a history entry is created, is always active and has no Settings toggle. Valid clips are still saved when Windows cannot identify their source application.

### Can I edit clips after capturing them?
Yes. Right-click a clip → Edit. This opens the edit modal, where you can modify the content and save with `Ctrl+S` or `Ctrl+Enter` (`Escape` cancels).

---

## Search

### How does search work?
CyberPaste runs a case-insensitive match over each clip's content and preview, directly in the local SQLite database. Results are paginated and instant.

### Can I filter by content type?
Yes. Use the filter chips: All, Text, Code, Images, Links, Files.

### Is search case-insensitive?
Yes. Search is case-insensitive by default.

### Does CyberPaste remember recent searches?
Yes. Recent searches are stored locally with most-recently-used ordering. Press `Ctrl+H` to open the history menu, reuse a query with the arrow keys and `Enter`, or clear the history. `%` and `_` are treated as literal characters, not wildcards.

---

## Export and Progress

### Can I save an individual clip?
Yes. Use **Save As** from a clip's context menu or from its content window. CyberPaste supports images, text, HTML, RTF, URLs, original files, and multi-file clips. The export does not modify the original clip.

### Are achievements sent anywhere?
No. Achievements and usage progress stay in the local profile. You can disable progress or reset it from Settings → Achievements & Progress. Manual and automatic backups include the progress snapshot.

---

## AI Actions

### What AI providers are supported?
- OpenAI
- DeepSeek
- Kimi (Moonshot AI)
- Gemini
- Grok (xAI)
- Meta (Muse Spark)
- Custom, any OpenAI-compatible endpoint (local Ollama, …)

### Is my data sent to the AI provider?
Only the selected clip content is sent. No history or metadata is included.

### Can I use AI offline?
Yes, select the Custom provider and point it at a local endpoint such as Ollama (`http://localhost:11434/v1`).

### Can I customize AI prompts?
Yes. Each action's prompt template can be edited in Settings → AI.

---

## Privacy

### Is my clipboard data synced to the cloud?
No. All data stays in a local SQLite database on your machine.

### How do I ignore sensitive applications?
Go to Settings → Security → **Excluded apps**. Add the executable name or path.

### Can I export my data?
Yes. Settings → Backup & Data → Backup & Restore → **Export backup**. The backup is a JSON file with clips, folders, images, settings, and local progress. For an individual clip, use **Save As** from its context menu.

### How do I delete all history?
Settings → Backup & Data → **Clear History** (with confirmation). It is also available in the title-bar menu.

---

## Troubleshooting

### Windows shows a SmartScreen warning on install
Expected for new releases until Windows builds enough reputation for the file; see [Installation & Setup](Installation-&-Setup#windows-smartscreen): click **More info**, then **Run anyway**.

### The main hotkey doesn't work
- Check if the hotkey conflicts with another application
- Verify the hotkey is set in Settings → General → Shortcuts
- Restart CyberPaste after changing hotkeys

### CyberPaste doesn't capture clips
- Ensure CyberPaste is running (check system tray)
- Check if the source app is in the ignored apps list
- Verify clipboard monitoring is enabled

### Clips are not showing in search
- Check if the clip type filter is set to "All"
- Try shorter or simpler search terms
- Note that images are not searchable by content, only OCR results saved as text clips are

### High memory usage
- Reduce the max items limit in Settings → Clipboard
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
See the [Donate section](https://github.com/CyberGems/CyberPaste#%EF%B8%8F-donate) on the main README.
