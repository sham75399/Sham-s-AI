import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

/**
 * Creates an ephemeral session token for OpenAI Realtime WebRTC.
 * Keeps the master OPENAI_API_KEY secure on the server and only
 * delivers a short-lived client_secret to the browser.
 */
export const createRealtimeSession = async (req, res) => {
  try {
    const apiKey =
      process.env.OPENAI_API_KEY ||
      (process.env.AI_API_KEY?.startsWith("sk-") ? process.env.AI_API_KEY : null);

    if (!apiKey) {
      return res.json({
        configured: false,
        message:
          "OPENAI_API_KEY is not set in backend/.env. Using continuous conversational voice mode.",
      });
    }

    const model =
      process.env.OPENAI_REALTIME_MODEL || "gpt-4o-mini-realtime-preview-2024-12-17";
    const voice = req.body.voice || "alloy";

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        modalities: ["audio", "text"],
        instructions:
          "You are Sham's AI, a friendly, helpful, and concise conversational AI assistant created by Sham. IMPORTANT IDENTITY RULE: If anyone asks who created you, who made you, who built you, or who your developer/creator is, you must ALWAYS state clearly and proudly that you were created by Sham (e.g. 'I was created by Sham' or in the user's language like 'Mujhe Sham ne banaya hai'). Never say you were created by OpenAI, Meta, Groq, or anyone else. In real-time voice conversations, speak naturally, warmly, and keep responses concise and conversational. Avoid markdown formatting in speech. Crucially, always reply in the EXACT SAME language that the user is speaking in (e.g. Hindi, Hinglish, Tamil, Telugu, Urdu, Spanish, English, etc.).",
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn("OpenAI Realtime session creation failed:", data);
      return res.status(response.status).json({
        configured: false,
        message:
          data.error?.message ||
          "Failed to create OpenAI Realtime session with provider.",
      });
    }

    return res.json({
      configured: true,
      client_secret: data.client_secret,
      model: data.model || model,
      voice: data.voice || voice,
      id: data.id,
    });
  } catch (error) {
    console.error("Realtime session error:", error);
    return res.status(500).json({
      configured: false,
      message: "Internal error creating real-time voice session.",
    });
  }
};

/**
 * Persist voice conversation turns into the conversation history
 * so voice exchanges are saved to the user's chat transcript.
 */
export const saveVoiceTurn = async (req, res, next) => {
  try {
    const { conversationId, userText, assistantText } = req.body;
    if (!conversationId) {
      return res.status(400).json({ message: "conversationId is required" });
    }

    const chat = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id,
    });
    if (!chat) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messagesToInsert = [];
    if (userText && userText.trim()) {
      messagesToInsert.push({
        conversationId: chat._id,
        role: "user",
        content: userText.trim(),
      });
    }
    if (assistantText && assistantText.trim()) {
      messagesToInsert.push({
        conversationId: chat._id,
        role: "assistant",
        content: assistantText.trim(),
      });
    }

    if (messagesToInsert.length > 0) {
      const inserted = await Message.insertMany(messagesToInsert);
      chat.updatedAt = new Date();
      await chat.save();
      return res.json({ success: true, messages: inserted });
    }

    return res.json({ success: true, messages: [] });
  } catch (error) {
    next(error);
  }
};
