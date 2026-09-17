import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

// GET /api/chats/:id/messages
export const getMessages = async (req, res, next) => {
  try {
    const chat = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const messages = await Message.find({ conversationId: chat._id }).sort({
      createdAt: 1,
    });
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// PUT /api/messages/:id  (feedback: like/dislike, or content edit)
export const updateMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const chat = await Conversation.findOne({
      _id: message.conversationId,
      userId: req.user._id,
    });
    if (!chat) return res.status(403).json({ message: "Not authorized" });

    if (req.body.feedback !== undefined) message.feedback = req.body.feedback;
    if (req.body.content !== undefined) message.content = req.body.content;

    await message.save();
    res.json(message);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/messages/:id
export const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const chat = await Conversation.findOne({
      _id: message.conversationId,
      userId: req.user._id,
    });
    if (!chat) return res.status(403).json({ message: "Not authorized" });

    await Message.findByIdAndDelete(message._id);
    res.json({ message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};