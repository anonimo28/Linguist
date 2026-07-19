import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
// @ts-ignore
import pdfParse from "pdf-parse/lib/pdf-parse.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase body limit to support large PDF and image uploads in base64
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const wordDictionaries: Record<string, Record<string, string>> = {
  es: {
    "el": "the", "la": "the", "los": "the", "las": "the", "un": "a", "una": "a", "unos": "some", "unas": "some",
    "y": "and", "o": "or", "pero": "but", "porque": "because", "si": "if", "como": "as",
    "en": "in", "de": "of", "a": "to", "para": "for", "con": "with", "sin": "without", "sobre": "on",
    "este": "this", "esta": "this", "ese": "that", "esa": "that", "estos": "these", "estas": "these",
    "yo": "I", "tú": "you", "él": "he", "ella": "she", "nosotros": "we", "ellos": "they", "ellas": "they",
    "me": "me", "te": "you", "se": "himself/herself/itself", "nos": "us", "le": "him/her", "les": "them",
    "mi": "my", "tu": "your", "su": "their/his/her",
    "es": "is", "son": "are", "era": "was", "eran": "were", "fue": "was", "fueron": "were", "tiene": "has", "tienen": "have",
    "hacer": "to do", "hecho": "done", "decir": "to say", "dicho": "said", "ir": "to go", "ido": "gone",
    "no": "no", "sí": "yes", "más": "more", "menos": "less", "muy": "very", "bien": "well", "mal": "badly",
    "todo": "all", "nada": "nothing", "algo": "something", "alguien": "someone",
    "hombre": "man", "mujer": "woman", "niño": "child", "niña": "girl", "amigo": "friend", "casa": "house",
    "libro": "book", "mundo": "world", "vida": "life", "tiempo": "time", "día": "day", "noche": "night",
    "amor": "love", "trabajo": "work", "mano": "hand", "parte": "part", "lugar": "place", "ciudad": "city",
    "país": "country", "palabra": "word", "historia": "story", "fuerza": "strength", "verdad": "truth",
    "nuevo": "new", "grande": "large", "pequeño": "small", "bueno": "good", "malo": "bad", "hermoso": "beautiful"
  },
  fr: {
    "le": "the", "la": "the", "les": "the", "un": "a", "une": "a", "des": "some",
    "et": "and", "ou": "or", "mais": "but", "car": "because", "si": "if", "comme": "as",
    "dans": "in", "en": "in", "de": "of", "à": "to", "pour": "for", "avec": "with", "sans": "without", "sur": "on",
    "ce": "this", "cette": "this", "ces": "these",
    "je": "I", "tu": "you", "il": "he", "elle": "she", "nous": "we", "vous": "you", "ils": "they", "elles": "they",
    "mon": "my", "ton": "your", "son": "his/her",
    "est": "is", "sont": "are", "était": "was", "étaient": "were", "a": "has", "ont": "have",
    "faire": "to do", "fait": "done", "dire": "to say", "dit": "said", "aller": "to go", "allé": "gone",
    "ne": "not", "pas": "not", "plus": "more", "moins": "less", "très": "very", "bien": "well", "mal": "badly",
    "tout": "all", "rien": "nothing", "quelque": "some", "quelqu'un": "someone",
    "homme": "man", "femme": "woman", "enfant": "child", "ami": "friend", "maison": "house",
    "livre": "book", "monde": "world", "vie": "life", "temps": "time", "jour": "day", "nuit": "night",
    "amour": "love", "travail": "work", "main": "hand", "partie": "part", "lieu": "place", "ville": "city",
    "pays": "country", "mot": "word", "histoire": "story", "force": "strength", "vérité": "truth",
    "nouveau": "new", "grand": "large", "petit": "small", "bon": "good", "mauvais": "bad", "beau": "beautiful"
  },
  de: {
    "der": "the", "die": "the", "das": "the", "ein": "a", "eine": "a",
    "und": "and", "oder": "or", "aber": "but", "weil": "because", "wenn": "if", "als": "as/when",
    "in": "in", "von": "of/from", "zu": "to", "für": "for", "mit": "with", "ohne": "without", "auf": "on",
    "dieser": "this", "diese": "this", "dieses": "this",
    "ich": "I", "du": "you", "er": "he", "sie": "she/they", "es": "it", "wir": "we", "ihr": "you (all)",
    "mein": "my", "dein": "your", "sein": "his/its", "ist": "is", "sind": "are", "war": "was", "waren": "were", "hat": "has", "haben": "have",
    "tun": "to do", "getan": "done", "sagen": "to say", "gesagt": "said", "gehen": "to go", "gegangen": "gone",
    "nicht": "not", "ja": "yes", "mehr": "more", "weniger": "less", "sehr": "very", "gut": "well/good", "schlecht": "badly/bad",
    "alles": "all", "nichts": "nothing", "etwas": "something", "jemand": "someone",
    "mann": "man", "frau": "woman", "kind": "child", "freund": "friend", "haus": "house",
    "buch": "book", "welt": "world", "leben": "life", "zeit": "time", "tag": "day", "nacht": "night",
    "liebe": "love", "arbeit": "work", "hand": "hand", "teil": "part", "ort": "place", "stadt": "city",
    "land": "country", "wort": "word", "geschichte": "story", "kraft": "strength", "wahrheit": "truth",
    "neu": "new", "groß": "large", "klein": "small", "schön": "beautiful"
  },
  it: {
    "il": "the", "la": "the", "i": "the", "le": "the", "un": "a", "una": "a",
    "e": "and", "o": "or", "ma": "but", "perché": "because", "se": "if", "come": "as",
    "in": "in", "di": "of", "a": "to", "per": "for", "con": "with", "senza": "without", "su": "on",
    "questo": "this", "questa": "this", "quello": "that", "quella": "that",
    "io": "I", "tu": "you", "lui": "he", "lei": "she", "noi": "we", "loro": "they",
    "mio": "my", "tuo": "your", "suo": "his/her",
    "è": "is", "sono": "are", "era": "was", "erano": "were", "ha": "has", "hanno": "have",
    "fare": "to do", "fatto": "done", "dire": "to say", "detto": "said", "andare": "to go", "andato": "gone",
    "non": "not", "sì": "yes", "più": "more", "meno": "less", "molto": "very", "bene": "well", "male": "badly/bad",
    "tutto": "all", "nulla": "nothing", "qualcosa": "something", "qualcuno": "someone",
    "uomo": "man", "donna": "woman", "bambino": "child", "amico": "friend", "casa": "house",
    "libro": "book", "mondo": "world", "vida": "life", "tempo": "time", "giorno": "day", "notte": "night",
    "amore": "love", "lavoro": "work", "mano": "hand", "parte": "part", "luogo": "place", "città": "city",
    "paese": "country", "parola": "word", "storia": "story", "forza": "strength", "verità": "truth",
    "nuovo": "new", "grande": "large", "piccolo": "small", "buono": "good", "bello": "beautiful"
  },
  la: {
    "et": "and", "in": "in", "de": "of", "ad": "to", "cum": "with", "sine": "without", "sub": "under",
    "non": "not", "sed": "but", "quia": "because", "si": "if", "ut": "as/that",
    "ego": "I", "tu": "you", "is": "he", "ea": "she", "id": "it", "nos": "we", "vos": "you",
    "meus": "my", "tuus": "your", "suus": "his/her/their",
    "est": "is", "sunt": "are", "erat": "was", "erant": "were", "habet": "has", "habent": "have",
    "facere": "to do", "factum": "done", "dicere": "to say", "dictum": "said", "ire": "to go", "iturus": "going",
    "homo": "man", "femina": "woman", "puer": "child", "amicus": "friend", "domus": "house",
    "liber": "book", "mundus": "world", "vita": "life", "tempus": "time", "dies": "day", "nox": "night",
    "amor": "love", "labor": "work", "manus": "hand", "pars": "part", "locus": "place", "civitas": "city",
    "patria": "country", "verbum": "word", "fabula": "story", "vis": "strength", "veritas": "truth",
    "novus": "new", "magnus": "large", "parvus": "small", "bonus": "good", "malus": "bad", "pulcher": "beautiful"
  }
};

function translateOffline(text: string, src: string, tgt: string): string {
  if (src === tgt) return text;

  const getWordTranslation = (word: string): string => {
    const lowerWord = word.toLowerCase();

    // 1. Direct dictionary translation (source to English)
    if (src !== "en" && tgt === "en") {
      const dict = wordDictionaries[src];
      if (dict && dict[lowerWord]) return dict[lowerWord];
    }

    // 2. Direct dictionary translation (English to target)
    if (src === "en" && tgt !== "en") {
      const dict = wordDictionaries[tgt];
      if (dict) {
        const found = Object.entries(dict).find(([k, v]) => v === lowerWord || v.split("/").includes(lowerWord));
        if (found) return found[0];
      }
    }

    // 3. Heuristic / Suffix rules for other words:
    if (tgt === "es") {
      if (lowerWord.endsWith("tion")) return lowerWord.slice(0, -4) + "ción";
      if (lowerWord.endsWith("tions")) return lowerWord.slice(0, -5) + "ciones";
      if (lowerWord.endsWith("ty")) return lowerWord.slice(0, -2) + "dad";
      if (lowerWord.endsWith("ties")) return lowerWord.slice(0, -4) + "dades";
      if (lowerWord.endsWith("ly")) return lowerWord.slice(0, -2) + "mente";
      if (lowerWord.endsWith("ous")) return lowerWord.slice(0, -3) + "oso";
      if (lowerWord.endsWith("ity")) return lowerWord.slice(0, -3) + "idad";
      if (lowerWord.endsWith("al")) return lowerWord;
      if (lowerWord.endsWith("ic")) return lowerWord + "o";
      if (lowerWord.endsWith("ical")) return lowerWord.slice(0, -4) + "ico";
      if (lowerWord.endsWith("ive")) return lowerWord.slice(0, -3) + "ivo";
      if (lowerWord.endsWith("ible")) return lowerWord;
      if (lowerWord.endsWith("able")) return lowerWord;
      if (lowerWord.endsWith("ent")) return lowerWord;
      if (lowerWord.endsWith("ant")) return lowerWord;
      if (lowerWord.length > 4) {
        if ("bcdfghjklmnpqrstvwxyz".includes(lowerWord[lowerWord.length - 1])) {
          return lowerWord + "o";
        }
      }
    } else if (tgt === "fr") {
      if (lowerWord.endsWith("tion")) return lowerWord;
      if (lowerWord.endsWith("tions")) return lowerWord;
      if (lowerWord.endsWith("ty")) return lowerWord.slice(0, -2) + "té";
      if (lowerWord.endsWith("ties")) return lowerWord.slice(0, -4) + "tés";
      if (lowerWord.endsWith("ly")) return lowerWord.slice(0, -2) + "ment";
      if (lowerWord.endsWith("ous")) return lowerWord.slice(0, -3) + "eux";
      if (lowerWord.endsWith("ity")) return lowerWord.slice(0, -3) + "ité";
      if (lowerWord.endsWith("al")) return lowerWord;
      if (lowerWord.endsWith("ic")) return lowerWord + "ue";
      if (lowerWord.endsWith("ical")) return lowerWord.slice(0, -4) + "ique";
      if (lowerWord.endsWith("ive")) return lowerWord.slice(0, -3) + "if";
      if (lowerWord.endsWith("ible")) return lowerWord;
      if (lowerWord.endsWith("able")) return lowerWord;
      if (lowerWord.endsWith("ent")) return lowerWord;
      if (lowerWord.endsWith("ant")) return lowerWord;
      if (lowerWord.length > 4) {
        if ("bcdfghjklmnpqrstvwxyz".includes(lowerWord[lowerWord.length - 1])) {
          return lowerWord + "e";
        }
      }
    } else if (tgt === "de") {
      if (lowerWord.endsWith("tion")) return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
      if (lowerWord.endsWith("ty")) return lowerWord.slice(0, -2) + "tät";
      if (lowerWord.endsWith("ly")) return lowerWord.slice(0, -2) + "lich";
      if (lowerWord.endsWith("ous")) return lowerWord.slice(0, -3) + "ig";
      if (lowerWord.endsWith("ive")) return lowerWord.slice(0, -3) + "iv";
      if (lowerWord.endsWith("ic")) return lowerWord + "isch";
      if (lowerWord.endsWith("ical")) return lowerWord.slice(0, -4) + "isch";
      if (lowerWord.endsWith("ful")) return lowerWord.slice(0, -3) + "voll";
      if (lowerWord.endsWith("less")) return lowerWord.slice(0, -4) + "los";
    } else if (tgt === "it") {
      if (lowerWord.endsWith("tion")) return lowerWord.slice(0, -4) + "zione";
      if (lowerWord.endsWith("tions")) return lowerWord.slice(0, -5) + "zioni";
      if (lowerWord.endsWith("ty")) return lowerWord.slice(0, -2) + "tà";
      if (lowerWord.endsWith("ly")) return lowerWord.slice(0, -2) + "mente";
      if (lowerWord.endsWith("ous")) return lowerWord.slice(0, -3) + "oso";
      if (lowerWord.endsWith("ity")) return lowerWord.slice(0, -3) + "ità";
      if (lowerWord.endsWith("ic")) return lowerWord + "o";
      if (lowerWord.endsWith("ive")) return lowerWord.slice(0, -3) + "ivo";
    } else if (tgt === "en") {
      if (lowerWord.endsWith("ción") || lowerWord.endsWith("zione")) return lowerWord.replace(/(ción|zione)$/, "tion");
      if (lowerWord.endsWith("ciones") || lowerWord.endsWith("zioni")) return lowerWord.replace(/(ciones|zioni)$/, "tions");
      if (lowerWord.endsWith("dad") || lowerWord.endsWith("té") || lowerWord.endsWith("tà") || lowerWord.endsWith("tät")) return lowerWord.replace(/(dad|té|tà|tät)$/, "ty");
      if (lowerWord.endsWith("mente") || lowerWord.endsWith("ment") || lowerWord.endsWith("lich")) return lowerWord.replace(/(mente|ment|lich)$/, "ly");
      if (lowerWord.endsWith("oso") || lowerWord.endsWith("eux") || lowerWord.endsWith("ig")) return lowerWord.replace(/(oso|eux|ig)$/, "ous");
      if (lowerWord.endsWith("idad") || lowerWord.endsWith("ité") || lowerWord.endsWith("ità")) return lowerWord.replace(/(idad|ité|ità)$/, "ity");
      if (lowerWord.endsWith("ico") || lowerWord.endsWith("ique") || lowerWord.endsWith("isch")) return lowerWord.replace(/(ico|ique|isch)$/, "ic");
      if (lowerWord.endsWith("ive") || lowerWord.endsWith("if")) return lowerWord.replace(/(ivo|if)$/, "ive");
    }

    return lowerWord;
  };

  const applyCasing = (original: string, translated: string): string => {
    if (!original || !translated) return translated;
    if (original === original.toUpperCase()) return translated.toUpperCase();
    if (original[0] === original[0].toUpperCase()) {
      return translated.charAt(0).toUpperCase() + translated.slice(1);
    }
    return translated;
  };

  return text.replace(/([A-Za-zÀ-ÿ]+)/g, (match) => {
    const trans = getWordTranslation(match);
    return applyCasing(match, trans);
  });
}

// Helper: Algorithmic translation using free Google Translate endpoint with rapid offline fallback
async function translateTextGtx(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const langMap: Record<string, string> = {
    "english": "en",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "italian": "it",
    "portuguese": "pt",
    "russian": "ru",
    "chinese": "zh",
    "japanese": "ja",
    "korean": "ko",
    "arabic": "ar",
    "dutch": "nl",
    "greek": "el",
    "hindi": "hi",
    "turkish": "tr",
    "vietnamese": "vi",
    "latin": "la",
    "swedish": "sv",
    "polish": "pl"
  };

  const getLangCode = (lang: string) => {
    const l = lang.trim().toLowerCase();
    if (langMap[l]) return langMap[l];
    if (l.length === 2) return l;
    return "auto";
  };

  const sl = getLangCode(sourceLang);
  const tl = getLangCode(targetLang) === "auto" ? "en" : getLangCode(targetLang);

  // If source and target are same, no translation is needed
  if (sl === tl) {
    return text;
  }

  // Divide text into manageable chunks of max 1800 characters to prevent URL size overflow
  const maxChunkSize = 1800;
  const chunks: string[] = [];
  let currentChunk = "";

  const lines = text.split("\n");
  for (const line of lines) {
    if (line.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      const sentences = line.match(/[^.!?]+[.!?]+(\s+|$)|.+/g) || [line];
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkSize) {
          if (currentChunk) {
            chunks.push(currentChunk);
          }
          currentChunk = sentence;
        } else {
          currentChunk = currentChunk ? currentChunk + sentence : sentence;
        }
      }
    } else {
      if ((currentChunk + "\n" + line).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + "\n" + line : line;
      }
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // Try Google Translate first, then MyMemory, then offline dictionary fallback
  const translateChunk = async (chunk: string): Promise<string> => {
    if (!chunk.trim()) return chunk;

    // 1. Try Google Translate (free endpoint)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(chunk)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          const translated = data[0].map((item: any) => item[0] || "").join("");
          if (translated && translated.trim()) return translated;
        }
      }
      throw new Error(`Google: ${res.status}`);
    } catch (err: any) {
      console.warn("Google Translate failed:", err.message || err);
    }

    // 2. Try MyMemory (free, reliable from server environments)
    try {
      const langPair = `${sl === "auto" ? "autodetect" : sl}|${tl}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${langPair}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.responseData && data.responseData.translatedText) {
          const translated = decodeURIComponent(data.responseData.translatedText);
          if (translated && translated.trim() && translated !== chunk) return translated;
        }
      }
      throw new Error(`MyMemory: ${res.status}`);
    } catch (err: any) {
      console.warn("MyMemory failed:", err.message || err);
    }

    // 3. Fall back to offline dictionary
    console.warn("All online APIs failed. Using offline dictionary.");
    return translateOffline(chunk, sl, tl);
  };

  const translatedChunks = await Promise.all(chunks.map(translateChunk));
  return translatedChunks.join("\n");
}

// Endpoint: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint: Translate Text
app.post("/api/translate-text", async (req, res): Promise<any> => {
  try {
    const { text, sourceLang, targetLang = "English", customInstructions, engine = "direct" } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required for translation." });
    }

    if (true) {
      console.log(`Translating text using direct translation algorithm to ${targetLang}...`);
      const translated = await translateTextGtx(text, sourceLang || "", targetLang);
      return res.json({ translatedText: translated });
    }
  } catch (error: any) {
    console.error("Translation Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during translation." });
  }
});

// Endpoint: Translate PDF
app.post("/api/translate-pdf", async (req, res): Promise<any> => {
  try {
    const { pdfBase64, pageInstructions, sourceLang, targetLang = "English", customInstructions, engine = "direct" } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "PDF base64 data is required." });
    }

    if (true) {
      console.log("Extracting text from PDF using pdf-parse on server...");
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const parsedPdf = await pdfParse(pdfBuffer);
      const extractedText = parsedPdf.text;

      if (!extractedText || !extractedText.trim()) {
        throw new Error("The uploaded PDF does not contain extractable plain text.");
      }

      console.log(`Translating extracted PDF text using direct translation algorithm to ${targetLang}...`);
      const translated = await translateTextGtx(extractedText, sourceLang || "", targetLang);
      return res.json({ translatedText: translated });
    }
  } catch (error: any) {
    console.error("PDF Translation Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during PDF translation." });
  }
});

// Endpoint: OCR & Translate Image
app.post("/api/ocr-translate", async (req, res): Promise<any> => {
  return res.status(400).json({ error: "Image OCR features are not available in this build." });
});

// Vite middleware & Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
