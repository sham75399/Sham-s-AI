import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

// PUT /api/users/profile
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.name) user.name = req.body.name;
    await user.save();

    res.json({ _id: user._id, name: user.name, email: user.email });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/password
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both fields are required" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/account
export const deleteAccount = async (req, res, next) => {
  try {
    const chats = await Conversation.find({ userId: req.user._id });
    const ids = chats.map((c) => c._id);
    await Message.deleteMany({ conversationId: { $in: ids } });
    await Conversation.deleteMany({ userId: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted" });
  } catch (error) {
    next(error);
  }
};

// GET /api/search/chats?q=
export const searchChats = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    const regex = new RegExp(q, "i");

    // Find chats by title or message content
    const chatsByTitle = await Conversation.find({
      userId: req.user._id,
      title: regex,
    });

    const matchingMessages = await Message.find({ content: regex }).select(
      "conversationId"
    );
    const convIds = [...new Set(matchingMessages.map((m) => m.conversationId))];

    const chatsByContent = await Conversation.find({
      _id: { $in: convIds },
      userId: req.user._id,
    });

    const combined = [...chatsByTitle, ...chatsByContent];
    const unique = combined.filter(
      (c, i, arr) => arr.findIndex((x) => x._id.equals(c._id)) === i
    );

    res.json(unique);
  } catch (error) {
    next(error);
  }
};