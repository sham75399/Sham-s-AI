import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, default: "" },
    attachment: {
      url: { type: String },
      originalName: { type: String },
      mimetype: { type: String },
      size: { type: Number },
    },
    feedback: { type: String, enum: ["like", "dislike", null], default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);