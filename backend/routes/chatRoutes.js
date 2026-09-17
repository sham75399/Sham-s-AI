import express from "express";
import {
  getConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  sendMessage,
  regenerateResponse,
} from "../controllers/chatController.js";
import { getMessages } from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";
import { transcribeAudio, synthesizeSpeech } from "../services/audioService.js";
import { uploadAudio } from "../middleware/uploadMiddleware.js";
import {
  createRealtimeSession,
  saveVoiceTurn,
} from "../services/realtimeService.js";

const router = express.Router();

router.use(protect);

router.get("/", getConversations);
router.post("/", createConversation);
router.get("/:id", getConversation);
router.put("/:id", updateConversation);
router.delete("/:id", deleteConversation);
router.get("/:id/messages", getMessages);

export default router;

// AI chat router (mounted separately in server.js as /api/chat)
export const aiRouter = express.Router();
aiRouter.use(protect);
aiRouter.post("/", sendMessage);
aiRouter.post("/regenerate", regenerateResponse);
aiRouter.post("/transcribe", protect, uploadAudio.single("audio"), transcribeAudio);
aiRouter.post("/speak", protect, synthesizeSpeech);
aiRouter.post("/realtime/session", protect, createRealtimeSession);
aiRouter.post("/realtime/save-turn", protect, saveVoiceTurn);