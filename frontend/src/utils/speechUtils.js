/**
 * Speech synthesis utility for Sham's AI
 * Provides bulletproof, instant text-to-speech across all browsers (Chrome, Edge, Safari, Firefox)
 * Solves all known Chromium speech synthesis bugs:
 * 1. Garbage collection bug (holds global reference so V8 never GC's active utterances)
 * 2. Chrome 15-second speech cutoff bug (keep-alive pause/resume timer)
 * 3. Cancel race condition (ensures clean event tick)
 * 4. Stalled/paused state bug (checks and resumes speechSynthesis)
 * 5. Asynchronous voice loading (primes getVoices cache on load)
 * 6. Multilingual language detection & voice matching (Devanagari, Tamil, Telugu, Urdu, etc.)
 * 7. Markdown & code cleanup (speaks clean natural language without weird symbols or raw code)
 */

if (typeof window !== "undefined") {
  window.__shamActiveUtterance = null;
  window.__shamSpeechTimer = null;

  // Prime the browser's voice list as early as possible
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    if ("onvoiceschanged" in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }
}

/**
 * Clean markdown and code formatting to produce clean, natural-sounding speech
 */
export const cleanTextForSpeech = (rawText) => {
  if (!rawText) return "";

  return rawText
    // Remove code blocks (e.g. ```python ... ```)
    .replace(/```[\s\S]*?```/g, " [code snippet] ")
    // Remove inline code (e.g. `const x = 1`)
    .replace(/`([^`]+)`/g, "$1")
    // Remove markdown images: ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // Remove markdown links: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove headers (# Header)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove blockquotes (> quote)
    .replace(/^>\s+/gm, "")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Remove bold, italic, strikethrough markers (*, _, ~)
    .replace(/[*_~]/g, "")
    // Remove raw URLs
    .replace(/https?:\/\/\S+/gi, "link")
    // Replace bullet points with pauses
    .replace(/^[\s]*[-*+]\s+/gm, ", ")
    // Clean up excessive whitespace and newlines
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

/**
 * Detect language script from text for proper TTS accent/voice
 */
export const detectLanguageFromText = (text, userPreference = null) => {
  if (userPreference && userPreference !== "auto") {
    return userPreference;
  }

  if (!text) return navigator.language || "en-IN";

  // Unicode script detection
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN"; // Hindi / Marathi / Nepali / Sanskrit
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN"; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN"; // Telugu
  if (/[\u0600-\u06FF]/.test(text)) return "ur-IN"; // Urdu / Arabic
  if (/[\u0980-\u09FF]/.test(text)) return "bn-IN"; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN"; // Gujarati
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN"; // Malayalam
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa-IN"; // Punjabi
  if (/[\u0400-\u04FF]/.test(text)) return "ru-RU"; // Russian
  if (/[\u3040-\u30ff]/.test(text)) return "ja-JP"; // Japanese
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN"; // Chinese
  if (/[\uac00-\ud7af]/.test(text)) return "ko-KR"; // Korean
  if (/[\u00C0-\u017F]/.test(text)) {
    if (/¿|¡|\b(el|la|los|las|por|que|como|para)\b/i.test(text)) return "es-ES";
    if (/\b(le|la|les|un|une|des|pour|avec)\b/i.test(text)) return "fr-FR";
    if (/\b(der|die|das|und|mit|auf|nicht)\b/i.test(text)) return "de-DE";
  }

  // Default to browser language or Indian English
  return navigator.language || "en-IN";
};

/**
 * Get the best matching speech synthesis voice for a language
 */
export const findBestVoice = (lang) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLang = (lang || "en-IN").toLowerCase().replace("_", "-");
  const targetPrefix = targetLang.split("-")[0];

  // 1. Exact match (e.g. 'en-in' or 'hi-in')
  let match = voices.find(
    (v) => v.lang.toLowerCase().replace("_", "-") === targetLang
  );
  if (match) return match;

  // 2. High quality natural/online voices for the language
  match = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith(targetPrefix) &&
      (v.name.includes("Natural") ||
        v.name.includes("Google") ||
        v.name.includes("Online"))
  );
  if (match) return match;

  // 3. Language prefix match (e.g. 'hi', 'ta', 'en')
  match = voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
  if (match) return match;

  // 4. Fallback to Indian English or any English
  match =
    voices.find((v) => v.lang.toLowerCase().includes("in")) ||
    voices.find((v) => v.lang.toLowerCase().startsWith("en"));

  return match || voices[0] || null;
};

/**
 * Stop any active browser speech synthesis cleanly
 */
export const stopBrowserSpeech = () => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  if (window.__shamSpeechTimer) {
    clearInterval(window.__shamSpeechTimer);
    window.__shamSpeechTimer = null;
  }

  window.__shamActiveUtterance = null;

  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (err) {
    console.warn("Speech cancel error:", err);
  }
};

/**
 * Speak text using native browser SpeechSynthesis.
 * Reliable across Chrome, Edge, Safari, Firefox on Windows, Mac, Linux, Mobile.
 */
export const speakBrowserText = (rawText, options = {}) => {
  const {
    lang = null,
    rate = 1.0,
    pitch = 1.0,
    onStart = () => {},
    onEnd = () => {},
    onError = () => {},
  } = options;

  if (typeof window === "undefined" || !window.speechSynthesis) {
    onError(new Error("SpeechSynthesis not supported in this browser"));
    return null;
  }

  // 1. Stop any currently playing speech cleanly
  stopBrowserSpeech();

  // 2. Clean the text for natural speaking
  const clean = cleanTextForSpeech(rawText);
  if (!clean) {
    onEnd();
    return null;
  }

  // 3. Detect language
  const targetLang = detectLanguageFromText(clean, lang);

  // 4. Create Utterance
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = targetLang;
  utterance.rate = rate;
  utterance.pitch = pitch;

  // 5. Select voice
  const voice = findBestVoice(targetLang);
  if (voice) {
    utterance.voice = voice;
  }

  // 6. CRITICAL: Store on window to avoid V8 garbage collection bug
  window.__shamActiveUtterance = utterance;

  // Cleanup helper
  const finish = (callback) => {
    if (window.__shamSpeechTimer) {
      clearInterval(window.__shamSpeechTimer);
      window.__shamSpeechTimer = null;
    }
    window.__shamActiveUtterance = null;
    if (typeof callback === "function") callback();
  };

  utterance.onstart = () => {
    // Chrome 15-second cutoff keepalive timer
    if (window.__shamSpeechTimer) clearInterval(window.__shamSpeechTimer);
    window.__shamSpeechTimer = setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(window.__shamSpeechTimer);
          window.__shamSpeechTimer = null;
        }
      }
    }, 9000);

    onStart();
  };

  utterance.onend = () => {
    finish(onEnd);
  };

  utterance.onerror = (e) => {
    // If canceled by user or interruption, don't treat as error
    if (e.error === "canceled" || e.error === "interrupted") {
      finish(onEnd);
    } else {
      console.warn("SpeechSynthesis error:", e.error);
      finish(() => onError(e));
    }
  };

  // 7. Chrome speech synthesis resume check
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  // Speak with slight delay (15ms) so cancel() has finished processing in browser engine
  setTimeout(() => {
    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("speechSynthesis.speak failed:", err);
      finish(() => onError(err));
    }
  }, 15);

  return utterance;
};
