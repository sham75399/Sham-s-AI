import fs from "fs";
import path from "path";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { generateAIResponse } from "../services/openaiService.js";
import { generateTitle } from "../utils/generateTitle.js";

// GET /api/chats
export const getConversations = async (req, res, next) => {
  try {
    const chats = await Conversation.find({ userId: req.user._id }).sort({
      updatedAt: -1,
    });
    res.json(chats);
  } catch (error) {
    next(error);
  }
};

// POST /api/chats
export const createConversation = async (req, res, next) => {
  try {
    const chat = await Conversation.create({
      userId: req.user._id,
      title: "New Chat",
    });
    res.status(201).json(chat);
  } catch (error) {
    next(error);
  }
};

// GET /api/chats/:id
export const getConversation = async (req, res, next) => {
  try {
    const chat = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    res.json(chat);
  } catch (error) {
    next(error);
  }
};

// PUT /api/chats/:id
export const updateConversation = async (req, res, next) => {
  try {
    const { title } = req.body;
    const chat = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title },
      { new: true }
    );
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    res.json(chat);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/chats/:id
export const deleteConversation = async (req, res, next) => {
  try {
    const chat = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    await Message.deleteMany({ conversationId: chat._id });
    res.json({ message: "Conversation deleted" });
  } catch (error) {
    next(error);
  }
};

// POST /api/chat  (main AI endpoint)
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, message, attachment } = req.body;

    if (!conversationId || (!message?.trim() && !attachment)) {
      return res
        .status(400)
        .json({ message: "A message or attachment is required" });
    }

    const chat = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id,
    });
    if (!chat) return res.status(404).json({ message: "Conversation not found" });

    // Save user message
    const userMessageDoc = await Message.create({
      conversationId: chat._id,
      role: "user",
      content: message?.trim() || "",
      ...(attachment ? { attachment } : {}),
    });

    // Auto-generate title if first message
    const messageCount = await Message.countDocuments({
      conversationId: chat._id,
    });
    if (messageCount <= 1) {
      chat.title = generateTitle(message?.trim() || attachment?.originalName || "New Chat");
      await chat.save();
    } else {
      chat.updatedAt = new Date();
      await chat.save();
    }

// Helper to build context from message history with multimodal image support
const buildConversationContext = (history) => {
  const uploadDir = path.join(process.cwd(), "uploads");

  // Find the last user message with an image attachment
  let lastImageMsgId = null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (
      history[i].role === "user" &&
      history[i].attachment?.mimetype?.startsWith("image/")
    ) {
      lastImageMsgId = history[i]._id?.toString();
      break;
    }
  }

  return history.map((m) => {
    const isTargetImage =
      m.role === "user" &&
      m.attachment &&
      m.attachment.mimetype?.startsWith("image/") &&
      m._id?.toString() === lastImageMsgId;

    if (isTargetImage) {
      const filename = path.basename(m.attachment.url || "");
      const filePath = path.join(uploadDir, filename);

      if (fs.existsSync(filePath)) {
        try {
          const fileBuffer = fs.readFileSync(filePath);
          const base64 = fileBuffer.toString("base64");
          const mime = m.attachment.mimetype || "image/jpeg";
          const dataUri = `data:${mime};base64,${base64}`;

          const promptText =
            m.content?.trim() ||
            "Please analyze this image carefully and tell me what image this is, identifying all objects, scenes, people, text, and details present.";

          return {
            role: m.role,
            content: [
              { type: "text", text: promptText },
              { type: "image_url", image_url: { url: dataUri } },
            ],
          };
        } catch (err) {
          console.error("Failed to read image for vision analysis:", err.message);
        }
      }
    }

    let content = m.content || "";
    if (m.attachment) {
      if (
        m.attachment.mimetype === "text/plain" ||
        m.attachment.mimetype === "text/csv"
      ) {
        const filename = path.basename(m.attachment.url || "");
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            const snippet = fs.readFileSync(filePath, "utf-8").slice(0, 3000);
            const fileDesc = `[Attached document: ${m.attachment.originalName}]\n\`\`\`\n${snippet}\n\`\`\``;
            content = content ? `${content}\n\n${fileDesc}` : fileDesc;
          } catch {
            const attachDesc = `[User attached file: ${m.attachment.originalName} (${m.attachment.mimetype})]`;
            content = content ? `${content}\n${attachDesc}` : attachDesc;
          }
        }
      } else {
        const attachDesc = `[User attached file: ${m.attachment.originalName} (${m.attachment.mimetype}, ${(m.attachment.size / 1024).toFixed(1)} KB)]`;
        content = content ? `${content}\n${attachDesc}` : attachDesc;
      }
    }

    return {
      role: m.role,
      content: content || " ",
    };
  });
};

    // Build context from all previous messages
    const history = await Message.find({ conversationId: chat._id })
      .sort({ createdAt: 1 })
      .select("role content attachment");

    const messages = buildConversationContext(history);

    // Call OpenAI / Groq
    const aiText = await generateAIResponse(messages);

    // Save assistant response
    const assistantMessage = await Message.create({
      conversationId: chat._id,
      role: "assistant",
      content: aiText,
    });

    res.json({
      userMessage: userMessageDoc,
      assistantMessage: {
        _id: assistantMessage._id,
        role: "assistant",
        content: aiText,
        createdAt: assistantMessage.createdAt,
      },
      title: chat.title,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/chat/regenerate
export const regenerateResponse = async (req, res, next) => {
  try {
    const { conversationId } = req.body;

    const chat = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id,
    });
    if (!chat) return res.status(404).json({ message: "Conversation not found" });

    // Delete last assistant message if it exists
    const last = await Message.findOne({
      conversationId: chat._id,
      role: "assistant",
    }).sort({ createdAt: -1 });

    if (last) await Message.findByIdAndDelete(last._id);

    const history = await Message.find({ conversationId: chat._id })
      .sort({ createdAt: 1 })
      .select("role content attachment");

    const messages = buildConversationContext(history);

    const aiText = await generateAIResponse(messages);

    const assistantMessage = await Message.create({
      conversationId: chat._id,
      role: "assistant",
      content: aiText,
    });

    res.json({
      assistantMessage: {
        _id: assistantMessage._id,
        role: "assistant",
        content: aiText,
        createdAt: assistantMessage.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};