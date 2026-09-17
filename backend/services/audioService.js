import OpenAI from "openai";
import fs from "fs";

const getClient = () => {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL || undefined;
  if (!apiKey) throw new Error("AI_API_KEY not configured");
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
};

// Speech-to-Text using Groq Whisper
export const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    const client = getClient();
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3-turbo",
      response_format: "text",
    });

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    res.json({ text: transcription });
  } catch (error) {
    console.error("Transcription error:", error.message);
    if (error.status === 429) {
      return res.status(429).json({ message: "Voice service busy. Try again." });
    }
    res.status(500).json({ message: "Could not transcribe audio" });
  }
};

// Text-to-Speech using OpenAI TTS if configured, or signaling browser speech synthesis
export const synthesizeSpeech = async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Text is required" });
    }

    const trimmed = text.slice(0, 4000);

    const openaiKey =
      process.env.OPENAI_API_KEY ||
      (process.env.AI_API_KEY?.startsWith("sk-") ? process.env.AI_API_KEY : null);

    if (openaiKey) {
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.audio.speech.create({
        model: "tts-1",
        voice: voice || "alloy",
        input: trimmed,
        response_format: "mp3",
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      res.set("Content-Type", "audio/mpeg");
      return res.send(buffer);
    }

    // Provider has no server TTS (Groq decommissioned playai-tts).
    // Gracefully instruct client to use high-quality native Web Speech API synthesis.
    return res.status(200).json({
      useBrowserSpeech: true,
      message: "Browser speech synthesis active",
    });
  } catch (error) {
    console.error("TTS error:", error.message);
    // Fall back to browser speech synthesis instead of failing
    res.status(200).json({
      useBrowserSpeech: true,
      message: "Fallback to browser speech synthesis",
    });
  }
};