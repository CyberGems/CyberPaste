use std::collections::HashMap;
use std::sync::Mutex;
use syntect::easy::HighlightLines;
use syntect::highlighting::ThemeSet;
use syntect::html::{append_highlighted_html_for_styled_line, IncludeBackground};
use syntect::parsing::SyntaxSet;

/// Lazily-initialized syntax set (default syntaxes) and theme.
static SYNTAX_SET: std::sync::OnceLock<SyntaxSet> = std::sync::OnceLock::new();
static THEME_SET: std::sync::OnceLock<ThemeSet> = std::sync::OnceLock::new();

/// Small LRU cache so re-opening the same clip is instant and we do not
/// re-highlight the whole content on every preview open.
const CACHE_CAPACITY: usize = 64;
static HIGHLIGHT_CACHE: std::sync::OnceLock<Mutex<HighlightCache>> = std::sync::OnceLock::new();

struct HighlightCache {
    map: HashMap<String, String>,
    order: std::collections::VecDeque<String>,
}

impl HighlightCache {
    fn new() -> Self {
        Self {
            map: HashMap::new(),
            order: std::collections::VecDeque::new(),
        }
    }

    fn get(&mut self, key: &str) -> Option<String> {
        self.map.get(key).cloned()
    }

    fn insert(&mut self, key: String, value: String) {
        if self.map.len() >= CACHE_CAPACITY {
            if let Some(oldest) = self.order.pop_front() {
                self.map.remove(&oldest);
            }
        }
        if !self.map.contains_key(&key) {
            self.order.push_back(key.clone());
        }
        self.map.insert(key, value);
    }
}

fn syntax_set() -> &'static SyntaxSet {
    SYNTAX_SET.get_or_init(SyntaxSet::load_defaults_newlines)
}

fn theme_set() -> &'static ThemeSet {
    THEME_SET.get_or_init(ThemeSet::load_defaults)
}

/// Highlight `content` as `extension` (e.g. "rs", "js") and return an
/// HTML fragment suitable for inline rendering in a <pre>. The background
/// is NOT inlined so the caller controls it via CSS (transparency, mica).
pub fn highlight_to_html(content: &str, extension: &str, cache_key: &str) -> Result<String, String> {
    if content.is_empty() {
        return Ok(String::new());
    }

    let cache = HIGHLIGHT_CACHE.get_or_init(|| Mutex::new(HighlightCache::new()));
    if let Ok(mut c) = cache.lock() {
        if let Some(html) = c.get(cache_key) {
            return Ok(html);
        }
    }

    let ps = syntax_set();
    let ts = theme_set();

    let syntax = ps
        .find_syntax_by_extension(extension)
        .unwrap_or_else(|| ps.find_syntax_plain_text());

    let Some(theme) = ts.themes.get("base16-ocean.dark").or_else(|| ts.themes.values().next()) else {
        return Err("no syntax theme available".to_string());
    };

    let mut highlighter = HighlightLines::new(syntax, theme);
    let mut html = String::new();

    for line in content.lines() {
        let regions = match highlighter.highlight_line(line, ps) {
            Ok(r) => r,
            Err(e) => {
                // A single problematic line shouldn't break the whole preview:
                // render it un-escaped/uncolored and keep going.
                log::warn!("highlight_line failed, falling back to plain text: {}", e);
                html.push_str(&line.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;"));
                html.push('\n');
                continue;
            }
        };
        append_highlighted_html_for_styled_line(
            &regions[..],
            IncludeBackground::No,
            &mut html,
        )
        .map_err(|e| format!("html error: {}", e))?;
        html.push('\n');
    }

    if let Ok(mut c) = cache.lock() {
        c.insert(cache_key.to_string(), html.clone());
    }

    Ok(html)
}
