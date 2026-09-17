import OpenAI from "openai";

// Read provider config from environment (lazy — read on every call)
const getProviderConfig = () => {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_BASE_URL || undefined;
  const model =
    process.env.AI_MODEL ||
    process.env.OPENAI_MODEL ||
    "llama-3.3-70b-versatile";

  return { apiKey, baseURL, model };
};

// Cache the client so we don't recreate it on every request
let cachedClient = null;
let cachedKey = null;

const getClient = () => {
  const { apiKey, baseURL } = getProviderConfig();

  if (!apiKey) {
    throw new Error(
      "AI API key is not configured. Set AI_API_KEY (or OPENAI_API_KEY) in backend/.env"
    );
  }

  // Rebuild the client only if the key changed
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    cachedKey = apiKey;
  }

  return cachedClient;
};

// Helper to detect if messages contain multimodal image content
const hasImageContent = (messages) => {
  return messages.some((m) => {
    if (Array.isArray(m.content)) {
      return m.content.some((part) => part?.type === "image_url");
    }
    return false;
  });
};

export const generateAIResponse = async (messages) => {
  try {
    const { baseURL, model: defaultModel } = getProviderConfig();
    const client = getClient();

    const isVision = hasImageContent(messages);
    let selectedModel = defaultModel;
    const extraParams = {};

    if (isVision) {
      if (baseURL && baseURL.includes("groq.com")) {
        // Groq vision model with enforced max_tokens for free tier limits
        selectedModel = process.env.AI_VISION_MODEL || "qwen/qwen3.8-27b";
        extraParams.max_tokens = 800;
      } else {
        selectedModel = process.env.AI_VISION_MODEL || "gpt-4o";
      }
    }

    const completion = await client.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "system",
          content:
            "You are Sham's AI, a helpful, friendly, and knowledgeable personal AI assistant created by Sham. IMPORTANT IDENTITY RULE: If anyone asks who created you, who made you, who built you, or who your developer/creator is, you must ALWAYS state clearly and proudly that you were created by Sham (for example: 'I was created by Sham', or in Hindi 'मुझे शाम (Sham) ने बनाया है', or in Hinglish 'Mujhe Sham ne banaya hai'). Never say you were created by OpenAI, Meta, Groq, or anyone else. Always communicate naturally and reply in the EXACT SAME language that the user speaks or writes in (for example: Hindi, Hinglish, Tamil, Telugu, Urdu, Bengali, Spanish, French, English, etc.). When an image is provided, analyze the image carefully and clearly tell the user what image this is, identifying all objects, people, scenes, animals, colors, text, and details present. In voice conversations, keep your responses natural, conversational, warm, and concise.",
        },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      ...extraParams,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("AI provider error:", error.message);

    const errMsg = error?.error?.message || error?.message || "";
    const errCode = error?.error?.code || error?.code;

    if (errCode === "insufficient_quota" || /no credits|quota/i.test(errMsg)) {
      throw new Error(
        "Sham's AI has run out of AI credits. Please contact the administrator."
      );
    }
    if (error.status === 401) {
      throw new Error("Invalid AI API key. Please contact the administrator.");
    }
    if (error.status === 429) {
      throw new Error(
        "Too many requests right now. Please wait a few seconds and try again."
      );
    }
    if (error.status === 404 || errCode === "model_not_found") {
      throw new Error(
        `The AI model "${getProviderConfig().model}" is unavailable. Contact the administrator.`
      );
    }
    if (error.status === 400) {
      throw new Error(
        "The request was rejected by the AI provider. Try a shorter message."
      );
    }
    if (error.status >= 500) {
      throw new Error(
        "The AI provider is temporarily unavailable. Please try again shortly."
      );
    }

    throw new Error("Something went wrong while generating the response.");
  }
};