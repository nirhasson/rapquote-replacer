// contentscript.js — Rap Quote Replacer (v6.0 — politician proximity + site filtering)

let replacementCount = 0;
let isEnabled = true;
let activeCategories = ["humor", "inspiration", "ego", "chill", "gangsta", "protest"];
let quotes = [];
const originalTextMap = new WeakMap();
let replacableNodes = new Set();


// ---------------------------
// News sites whitelist
// ---------------------------
const newsSites = [
  // ישראל
  "ynet", "haaretz", "maariv", "globes", "n12", "mako", "walla", "kan",
  "themarker", "calcalist", "timesofisrael", "israelhayom", "jpost",
  "c14", "channel14",          // ערוץ 14
  "reshet13", "thirteen",      // רשת 13
  "channel12", "news12",       // ערוץ 12 (נוסף על n12)
  "inn", "arutz7",             // ערוץ 7 / Arutz Sheva
  "i24news",                   // i24
  "one.co.il",                 // ONE
  "sport5",                    // ספורט 5 (לכתבות פוליטיות שם)
  "nrg.co.il",                 // NRG
  "news.walla",                // ענף החדשות של וואלה (מכוסה גם ע"י walla)
  // בינלאומי
  "bbc", "cnn", "nytimes", "guardian", "reuters", "foxnews",
  "washingtonpost", "aljazeera", "skynews", "abcnews", "nbcnews", "apnews",
  "politico", "axios", "thehill", "vice", "huffpost", "buzzfeednews",
  "independent", "telegraph", "thetimes", "newsweek", "bloomberg",
  "ft.com", "economist", "dw.com", "euronews", "france24"
];

// ---------------------------
// Excluded category URL path segments (not generic words — only paths clearly non-news)
// ---------------------------
const excludedPathSegments = [
  "/entertainment/", "/entertainment?", "/music/", "/music?",
  "/culture/", "/art/", "/lifestyle/", "/tv/", "/films/",
  "/health/", "/food/", "/travel/", "/sport/", "/sports/",
  "/fashion/", "/beauty/", "/tech-product", "/gaming/"
];

const excludedQueryParams = [
  "section=entertainment", "section=music", "section=sport",
  "category=entertainment", "category=music", "category=culture",
  "category=art", "category=lifestyle"
];

// ---------------------------
// Politicians list (Hebrew + English)
// ---------------------------
const politicians = [
  // ראשי ממשלה ונשיאים ישראלים
  "נתניהו", "בנימין נתניהו", "ביבי", "בנט", "נפתלי בנט", "לפיד", "יאיר לפיד",
  "אולמרט", "שרון", "אריאל שרון", "פרס", "שמעון פרס", "רבין", "יצחק רבין",
  "הרצוג", "יצחק הרצוג",

  // ליכוד
  "שלמה קרעי", "קרעי",
  "ישראל כץ", "יולי אדלשטיין", "גלעד ארדן", "חיים כץ",
  "דוד אמסלם", "אמסלם", "אופיר כץ", "אבי דיכטר", "דיכטר",
  "מיכי זוהר", "עמיחי שיקלי", "שיקלי", "דני דנון", "דנון",
  "טלי גוטליב", "גוטליב", "ציון פיניאן", "יוסי כהן", "לימור לביא",
  "משה כחלון", "כחלון", "הגר ורדן", "ורדן", "דן מריאנשטיין",

  // שאר שרים וח"כים — ממשלה וקואליציה
  "בן גביר", "איתמר בן גביר", "סמוטריץ", "בצלאל סמוטריץ",
  "גנץ", "בני גנץ", "גדעון סער", "סער", "ניר ברקת", "ברקת",
  "יריב לוין", "לוין", "שמחה רוטמן", "רוטמן",
  "מירי רגב", "רגב", "אביגדור ליברמן", "ליברמן",
  "גדי איזנקוט", "איזנקוט", "אורית סטרוק", "סטרוק",
  "עידית סילמן", "יואב קיש", "קיש",
  "אמיר אוחנה", "אוחנה", "דוד ביטן", "ביטן",
  "אריה דרעי", "דרעי", "מיכאל מלכיאלי", "מלכיאלי", "משה גפני", "גפני",
  "יצחק גולדקנוף", "גולדקנוף", "אביחי בוארון", "בוארון", "אבי מעוז", "מעוז",
  "יפעת שאשא-ביטון", "חיים ביטון", "נסים ואטורי", "ואטורי",
  "זהבה גלאון", "תמר זנדברג", "זנדברג", "סון הר-מלך",
  "עמית סגל", "אבי מעוז",
  "יצחק קרויזר", "קרויזר", "צביקה פוגל", "פוגל",
  "אוהד טל", "זבולון כלפה", "כלפה",
  "יואב בן-צור", "בן-צור", "דוד אזולאי", "אזולאי",
  "מאיר פרוש", "פרוש", "אורי מקלב", "מקלב",

  // ח"כים — אופוזיציה
  "מרב מיכאלי", "מיכאלי", "עומר בר לב", "בר לב",
  "נחמן שי", "גלעד קריב", "קריב", "יואל רזבוזוב", "רזבוזוב",
  "רם בן-ברק", "בן-ברק", "איציק שמולי", "שמולי", "מוסי רז",
  "אפרת רייטן", "רייטן",
  "קארין אלהרר", "אלהרר", "בועז טופורובסקי", "טופורובסקי",
  "מתן כהנא", "עמית בוצר", "בוצר", "יפה בן דוד",
  "מנסור עבאס", "עבאס",
  "איימן עודה", "עודה", "אחמד טיבי", "טיבי",
  "וליד טאהא", "אוסאמה סעדי",

  // יו"ר ועדות / דמויות מפתח
  "גאלית דיסטל אטברין", "דיסטל אטברין", "גאלית דיסטל", "דיסטל",

  // תפקידים
  'ח"כ', 'יו"ר הכנסת', "ראש הממשלה", "שר הביטחון", "שר המשפטים",
  "שר האוצר", "שר החוץ", "שר הפנים", "שרת החינוך", "שר הבריאות",
  "הנשיא", "האופוזיציה", "הקואליציה",

  // מפלגות
  "הליכוד", "יש עתיד", "מרצ", "העבודה", "ישראל ביתנו", "הרשימה המשותפת",
  "עוצמה יהודית", "הציונות הדתית", "ש\"ס", "יהדות התורה", "כחול לבן",
  "המחנה הממלכתי", "הדמוקרטים", "רע\"מ", "חד\"ש",

  // בינלאומי — אנגלית
  "Joe Biden", "President Biden", "Donald Trump", "Trump", "Obama", "Barack Obama",
  "Kamala Harris", "Vladimir Putin", "Putin", "Zelensky", "Volodymyr Zelensky",
  "Macron", "Emmanuel Macron", "Rishi Sunak", "Boris Johnson", "Justin Trudeau",
  "Benjamin Netanyahu", "Giorgia Meloni", "Olaf Scholz", "Xi Jinping",
  "Elon Musk", "Mike Pence", "Ron DeSantis", "Nancy Pelosi", "Chuck Schumer",
  "Mitch McConnell", "Anthony Blinken", "Ursula von der Leyen", "Charles Michel",
  "Keir Starmer", "Starmer", "JD Vance", "Vance", "Pete Buttigieg", "Buttigieg",
  "Viktor Orban", "Orban", "Recep Tayyip Erdogan", "Erdogan",
  "Mohammed bin Salman", "MBS", "Kim Jong-un",
  "Bernie Sanders", "Sanders", "Alexandria Ocasio-Cortez", "AOC",
  "Narendra Modi", "Modi", "Javier Milei", "Milei",
  "Marine Le Pen", "Le Pen", "Nigel Farage", "Farage",
  "Angela Merkel", "Merkel", "Friedrich Merz", "Merz",
  "Scott Bessent", "Tulsi Gabbard", "Robert F. Kennedy", "RFK",

  // בינלאומי — תעתיק עברי (קריטי לכתבות בעברית)
  "טראמפ", "דונלד טראמפ", "הנשיא טראמפ",
  "ביידן", "ג'ו ביידן", "הנשיא ביידן",
  "אובמה", "ברק אובמה",
  "האריס", "קמלה האריס",
  "פוטין", "ולדימיר פוטין",
  "זלנסקי", "וולודימיר זלנסקי",
  "מקרון", "עמנואל מקרון",
  "סונאק", "ריישי סונאק",
  "ג'ונסון", "בוריס ג'ונסון",
  "טרודו", "ג'סטין טרודו",
  "מלוני", "ג'ורג'ה מלוני",
  "שולץ", "אולף שולץ",
  "שי ג'ינפינג",
  "מאסק", "אילון מאסק",
  "פנס", "מייק פנס",
  "פלוסי", "נאנסי פלוסי",
  "בלינקן", "אנתוני בלינקן",
  "פון דר ליין", "אורסולה פון דר ליין",
  "רובייו", "מרקו רובייו",
  "הגס", "פיט הגס",
  "סטארמר", "קיר סטארמר",
  "ואנס", "ג'יי די ואנס",
  "אורבן", "ויקטור אורבן",
  "ארדואן", "רג'פ טאיפ ארדואן",
  "בן סלמאן", "מוחמד בן סלמאן",
  "קים ג'ונג-און",
  "סנדרס", "ברני סנדרס",
  "אוקסיו-קורטז",
  "מודי", "נרנדרה מודי",
  "מילי", "חאוויר מילי",
  "לה פן", "מרין לה פן",
  "פאראג'", "ניג'ל פאראג'",
  "מרקל", "אנגלה מרקל",
  "מרץ", "פרידריך מרץ",
  "גאבארד", "טולסי גאבארד",
  "קנדי", "רוברט קנדי",

  // פרוגרסיבים אמריקאים
  "ממדאני", "זוהראן ממדאני",
  "עומר", "אילהאן עומר",
  "טלייב", "רשידה טלייב",
  "בומן", "ג'מאל בומן",
  "Zohran Mamdani", "Mamdani", "Ilhan Omar", "Rashida Tlaib",
  "Jamaal Bowman", "Cori Bush", "Greg Casar", "Maxwell Frost",

  // ח"כים — מגזר ערבי (נוספים)
  "ג'בארין", "יוסף ג'בארין",
  "זועבי", "ג'אדה רינאוי-זועבי", "חנין זועבי",
  "זחאלקה", "ג'מאל זחאלקה",
  "אבו-ארר", "מסעוד גנאים",
  "אסד", "אמל אסד",
  "אבו שחאדה", "סאמי אבו שחאדה",
  "כנעאן", "יוסף כנעאן",

  // רשות פלסטינית / פלסטין
  "אבו מאזן", "מחמוד עבאס",
  "מש'על", "ח'אלד מש'על",
  "Mahmoud Abbas", "Abu Mazen", "Khaled Meshaal",

  // לבנון
  "נסראללה", "חסן נסראללה",
  "נעים קאסם", "קאסם",
  "ברי", "נבי ברי",
  "מיקאתי", "נג'יב מיקאתי",
  "באסיל", "ג'בראן באסיל",
  "עון", "מישל עון",
  "Hassan Nasrallah", "Naim Qassem", "Nabih Berri", "Najib Mikati",

  // סוריה
  "אסד", "בשאר אסד",
  "אל-שרע", "אחמד אל-שרע",
  "ג'ולאני", "אבו מחמד אל-ג'ולאני",
  "Bashar al-Assad", "Assad", "Ahmad al-Sharaa", "al-Jolani",

  // איראן
  "חמינאי", "עלי חמינאי", "עלי ח'אמנאי",
  "פזשכיאן", "מסעוד פזשכיאן",
  "רייסי", "אבראהים רייסי",
  "סולימאני", "קאסם סולימאני",
  "Khamenei", "Ali Khamenei", "Pezeshkian", "Masoud Pezeshkian",
  "Soleimani", "Qasem Soleimani", "Raisi",

  // ירדן / מצרים / המזרח התיכון
  "עבדאללה", "מלך עבדאללה",
  "סיסי", "עבד אל-פתאח א-סיסי",
  "King Abdullah", "Sisi", "al-Sisi",
  "בן זאיד", "מוחמד בן זאיד",
  "Mohammed bin Zayed", "MBZ"
];

const speechMarkers = [
  // אמירה ישירה
  "אמר", "אמרה", "הוסיף", "הוסיפה", "ציין", "ציינה", "הסביר", "הסבירה",
  "טען", "טענה", "הצהיר", "הצהירה", "הדגיש", "הדגישה", "הודה", "הודתה",
  "מסר", "מסרה", "סיפר", "סיפרה", "פירט", "פירטה", "הגיב", "הגיבה",
  "השיב", "השיבה", "הבהיר", "הבהירה", "התייחס", "התייחסה", "סיכם", "סיכמה",
  "כתב", "כתבה", "צייץ", "ציצה", "קרא", "קראה",
  // ניסוחים מורכבים
  "עוד נכתב", "נכתב כי", "נמסר", "נמסר כי", "טען כי", "הבהיר כי",
  "ציין כי", "הוסיף ואמר", "אמר כי", "הגיב ואמר", "עוד הוסיף",
  "בהצהרתו", "בהצהרתה", "בהתייחסותו", "בהתייחסותה",
  "בהודעתו", "בהודעתה", "בהודעתו של", "בהודעתה של",
  // ייחוס ("לדברי X", "לפי X")
  "לדבריו", "לדבריה", "לדבריו של", "לדבריה של",
  "לדברי",   // ← חדש: "לדברי טראמפ", "לדברי נתניהו"
  "לפי",     // ← חדש: "לפי טראמפ", "לפי ראש הממשלה"
  "בדבריו", "בדבריה",
  // אנגלית
  "said", "added", "stated", "commented", "remarked", "told", "according to",
  "claimed", "declared", "explained", "tweeted", "posted", "responded",
  "announced", "wrote", "confirmed", "warned", "argued", "insisted", "noted",
  "emphasized", "stressed", "added"
];

// ---------------------------
// Helper functions
// ---------------------------
function isNewsSite() {
  const host = window.location.hostname.toLowerCase();
  return newsSites.some(s => host.includes(s));
}

function isExcludedCategory() {
  const url = window.location.href.toLowerCase();
  // Check path segments (requires trailing slash or query param to avoid false positives)
  if (excludedPathSegments.some(seg => url.includes(seg))) return true;
  // Check query params
  if (excludedQueryParams.some(p => url.includes(p))) return true;
  return false;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsPolitician(text) {
  if (!text) return false;
  return politicians.some(p => new RegExp(`(?:^|[\\s,״"'(])${escapeRegex(p)}(?=$|[\\s,״"'.!?)])`, "iu").test(text));
}

// Returns true if a politician appears in the article's h1/title — marks it as a political article
// Cached so querySelector + regex loop don't run on every node in the article.
let _isPoliticalArticleCache = null;
function isPoliticalArticle() {
  if (_isPoliticalArticleCache !== null) return _isPoliticalArticleCache;
  const h1 = document.querySelector("h1");
  const title = document.title || "";
  const headingText = (h1?.textContent || "") + " " + title;
  _isPoliticalArticleCache = containsPolitician(headingText);
  return _isPoliticalArticleCache;
}

// Check if a politician is mentioned near the quote.
// In political articles (politician in title): 250 chars back, 150 forward.
// In non-political articles: require much tighter proximity (80 chars back only).
function politicianNearMatch(nodeText, matchIndex, matchLength) {
  const political = isPoliticalArticle();
  const window_back = political ? 250 : 80;
  const window_fwd  = political ? 150 : 40;
  const start = Math.max(0, matchIndex - window_back);
  const end = Math.min(nodeText.length, matchIndex + (matchLength || 0) + window_fwd);
  const context = nodeText.substring(start, end);
  return containsPolitician(context);
}

function isValidQuoteText(q) {
  if (!q) return false;
  const words = q.trim().split(/\s+/).filter(Boolean);
  return words.length >= 3 && words.length <= 200;
}

const usedQuoteIds = new Set();

function getRandomQuote() {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return { text: "🎤 No quotes loaded", artist: "System", song: "N/A" };
  }
  const filtered = quotes.filter(q =>
    !usedQuoteIds.has(q.id || q.text) &&
    (!q.categories || q.categories.some(cat => activeCategories.includes(cat)))
  );
  const list = filtered.length ? filtered : quotes; // fallback if all used
  const quote = list[Math.floor(Math.random() * list.length)];
  usedQuoteIds.add(quote.id || quote.text);
  return quote;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
  );
}

let MAX_REPLACEMENTS_PER_PAGE = 3;

// ---------------------------
// Load categories from storage
// ---------------------------
chrome.storage.local.get(["activeCategories", "quoteCount"], (res) => {
  if (res.activeCategories) activeCategories = res.activeCategories;
  if (res.quoteCount) MAX_REPLACEMENTS_PER_PAGE = res.quoteCount;
});

// ---------------------------
// Load quotes from JSON
// ---------------------------
// ← החלף ב-URL של ה-repo שלך:
const REMOTE_LYRICS_URL = "https://raw.githubusercontent.com/YOUR_USERNAME/rapquote-replacer/main/lyrics.json";

async function loadQuotesSafely() {
  try {
    let text;
    try {
      const remote = await fetch(REMOTE_LYRICS_URL, { cache: "no-cache" });
      if (remote.ok) {
        text = await remote.text();
          } else {
        throw new Error("remote fetch failed");
      }
    } catch {
      const local = await fetch(chrome.runtime.getURL("lyrics.json"));
      text = await local.text();
    }
    const cleaned = text.replace(/[\u0000-\u001F]+/g, "");
    quotes = JSON.parse(cleaned);

    if (!isNewsSite() || isExcludedCategory()) return;

    if (isEnabled) replaceQuotesOnNodes();
  } catch (err) {
    console.error("❌ Error loading lyrics.json:", err);
  }
}

// ---------------------------
// Collect text nodes
// ---------------------------
function collectReplacableNodes() {
  const nodes = Array.from(document.querySelectorAll(
    "p, blockquote, [itemprop='articleBody'], [itemprop='articleBody'] p, " +
    "div.article, div.article-content, div.textBody, " +
    ".article-body p, .post-content p, .entry-content p, " +
    "[class*='article-body'] p, [class*='articleBody'] p, [class*='article_body'] p"
  ));
  // Add only new nodes (don't overwrite original HTML already stored)
  nodes.forEach(node => {
    replacableNodes.add(node);
    if (!originalTextMap.has(node)) originalTextMap.set(node, node.innerHTML);
  });
}

// ---------------------------
// Replace quotes with tooltip + YouTube link
// ---------------------------

// Quote character classes (open and close kept separate so typographic pairs match)
const QUOTE_OPEN = `["\u{201C}״\u{05F4}]`;    // " (ASCII), " (U+201C), ״ / U+05F4
const QUOTE_CLOSE = `["\u{201D}״\u{05F4}]`;    // " (ASCII), " (U+201D), ״ / U+05F4
const QUOTE_INNER = `[^"\u{201C}\u{201D}״\u{05F4}]{3,1500}`; // up to 1500 chars (long politician quotes)

// Pattern A: Western style  — speechMarker ... "quote"  (e.g. Trump said "we won", Trump told reporters: "we won")
// Pattern B: Hebrew style   — "quote" ... speechMarker  (e.g. ״אנחנו ננצח״, אמר טראמפ)
// Pattern C: English inverted — "quote," Name said.  (e.g. "We will win," Trump said)
function buildQuoteRegexes() {
  const sp = speechMarkers.map(escapeRegex).join("|");
  // A: speech marker, then up to 60 non-quote chars (e.g. "told reporters"), then opening quote
  const patternA = new RegExp(`(?:${sp})[^"\u{201C}\u{201D}״\u{05F4}]{0,60}${QUOTE_OPEN}(${QUOTE_INNER})${QUOTE_CLOSE}`, "iu");
  // B: Hebrew — closing quote, then up to 4 punctuation/space chars, then speech marker
  const patternB = new RegExp(`${QUOTE_OPEN}(${QUOTE_INNER})${QUOTE_CLOSE}[,\\s]{0,4}(?:${sp})`, "iu");
  // C: English inverted — closing quote, then up to 60 non-quote chars (e.g. ", Trump"), then speech marker
  const patternC = new RegExp(`${QUOTE_OPEN}(${QUOTE_INNER})${QUOTE_CLOSE}[^"\u{201C}\u{201D}״\u{05F4}]{0,60}(?:${sp})`, "iu");
  return [patternA, patternB, patternC];
}


function replaceQuotesOnNodes() {
  if (!isEnabled) return;
  if (replacementCount >= MAX_REPLACEMENTS_PER_PAGE) return;
  let foundCount = 0;
  const [regexA, regexB, regexC] = buildQuoteRegexes(); // A = western, B = Hebrew reversed, C = English inverted

  replacableNodes.forEach(container => {
    // Fast pre-filter: skip containers with no politician mention at all
    if (!containsPolitician(container.textContent)) return;

    // ⚠️ Collect ALL text nodes FIRST before any DOM mutation.
    // Mutating the DOM while a TreeWalker is iterating causes it to skip nodes —
    // that's why only the first quote was being replaced.
    const textNodes = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.trim()) textNodes.push(node);
    }

    // Use a queue so that after splitting a text node, the remainder is re-examined.
    // This handles multiple quotes within the same original text node (common in ynet).
    const queue = [...textNodes];
    while (queue.length > 0) {
      const textNode = queue.shift();
      if (!textNode.parentNode) continue; // node may have been removed by a prior replacement

      // Try western style first, then Hebrew reversed style
      let match = textNode.nodeValue.match(regexA) || textNode.nodeValue.match(regexB) || textNode.nodeValue.match(regexC);
      if (!match || !isValidQuoteText(match[1])) continue;

      // Proximity check: politician must appear near this specific quote.
      // In non-political articles, skip the parent fallback — it's too broad.
      if (!politicianNearMatch(textNode.nodeValue, match.index, match[0].length)) {
        if (!isPoliticalArticle()) {
              continue;
        }
        const parentText = textNode.parentElement?.textContent || "";
        const parentMatchIdx = parentText.indexOf(match[0]);
        if (parentMatchIdx === -1 || !politicianNearMatch(parentText, parentMatchIdx, match[0].length)) {
          continue;
        }
      }

      // Find the opening quote character position within the full match
      const openQuoteOffset = match[0].search(/["\u{201C}״\u{05F4}]/u);
      if (openQuoteOffset === -1) continue;
      const startIndex = match.index + openQuoteOffset;
      // Length: opening quote char (1) + quoted text + closing quote char (1)
      const replacedLength = 1 + match[1].length + 1;

      const after = textNode.splitText(startIndex);
      const remainder = after.splitText(replacedLength);

      // Push remainder back onto the queue — it may contain more quotes
      if (remainder && remainder.nodeValue && remainder.nodeValue.trim()) {
        queue.unshift(remainder);
      }

      const randomQuote = getRandomQuote();

      const span = document.createElement("span");
      span.className = "rap-quote-replaced";
      span.style.background = "rgba(255,255,0,0.3)";
      span.style.fontWeight = "600";
      span.textContent = randomQuote.text || "[missing]";

      const tooltip = `<strong>${escapeHtml(randomQuote.artist)}</strong> — <em>${escapeHtml(randomQuote.song)}</em>`;
      span.setAttribute("data-tooltip", encodeURIComponent(tooltip));

      let ytLink = randomQuote.youtubeUrl || "#";
      if (ytLink && ytLink !== "#" && !ytLink.startsWith("http")) {
        ytLink = "https://" + ytLink;
      }
      const link = document.createElement("a");
      link.href = ytLink;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.textDecoration = "none";
      link.style.color = "inherit";
      link.appendChild(span);

      after.parentNode.replaceChild(link, after);
      foundCount++;

      if (replacementCount + foundCount >= MAX_REPLACEMENTS_PER_PAGE) return;
    }

    if (replacementCount + foundCount >= MAX_REPLACEMENTS_PER_PAGE) return;
  });

  replacementCount += foundCount;
}

// ---------------------------
// Remove replaced quotes
// ---------------------------
function removeReplacedQuotes() {
  replacableNodes.forEach(node => {
    const original = originalTextMap.get(node);
    if (original !== undefined) node.innerHTML = original;
  });
  replacementCount = 0;
  usedQuoteIds.clear();
  _isPoliticalArticleCache = null;
}

// ---------------------------
// Tooltip hover
// ---------------------------
document.addEventListener("mouseover", e => {
  const t = e.target;
  if (t?.classList?.contains("rap-quote-replaced")) {
    const tooltipHtml = decodeURIComponent(t.getAttribute("data-tooltip") || "");
    if (!tooltipHtml) return;
    let el = document.querySelector(".rap-tooltip-container");
    if (el) el.remove();
    el = document.createElement("div");
    el.className = "rap-tooltip-container";
    el.innerHTML = tooltipHtml;
    Object.assign(el.style, {
      position: "absolute",
      background: "#111",
      color: "#fff",
      padding: "8px 10px",
      borderRadius: "6px",
      zIndex: "999999",
      boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
      fontSize: "13px",
      pointerEvents: "none",
      maxWidth: "300px"
    });
    document.body.appendChild(el);
    const rect = t.getBoundingClientRect();
    // Avoid overflow at right edge
    const leftPos = Math.min(rect.left + window.scrollX, window.innerWidth - 320);
    el.style.top = `${rect.bottom + window.scrollY + 6}px`;
    el.style.left = `${Math.max(0, leftPos)}px`;
  }
});
document.addEventListener("mouseout", e => {
  if (e.target?.classList?.contains("rap-quote-replaced")) {
    const el = document.querySelector(".rap-tooltip-container");
    if (el) el.remove();
  }
});

// ---------------------------
// MutationObserver — re-collect nodes before replacing
// ---------------------------
let observerScheduled = false;
const observer = new MutationObserver(() => {
  if (observerScheduled) return;
  observerScheduled = true;
  setTimeout(() => {
    observerScheduled = false;
    if (isEnabled && isNewsSite() && !isExcludedCategory()) {
      collectReplacableNodes(); // pick up any new dynamic nodes
      replaceQuotesOnNodes();
    }
  }, 800);
});
observer.observe(document.body, { childList: true, subtree: true });

// ---------------------------
// Listener from popup
// ---------------------------
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "applySettings") {
    isEnabled = msg.enabled;
    activeCategories = msg.categories;
    MAX_REPLACEMENTS_PER_PAGE = msg.quoteCount;
    removeReplacedQuotes();
    if (isEnabled) {
      collectReplacableNodes();
      replaceQuotesOnNodes();
    }
  }

  if (msg.action === "getReplacementCount") sendResponse({ count: replacementCount });

  return true;
});

// ---------------------------
// Init
// ---------------------------
collectReplacableNodes();
loadQuotesSafely();

// Extra pass for React/SPA sites that render content after document_idle.
// Runs only if quotes are already loaded (loadQuotesSafely is async).
setTimeout(() => {
  if (quotes.length > 0 && isEnabled && isNewsSite() && !isExcludedCategory()) {
    collectReplacableNodes();
    replaceQuotesOnNodes();
  }
}, 2000);
