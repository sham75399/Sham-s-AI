import express from "express";
import {
  updateMessage,
  deleteMessage,
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);

router.put("/:id", updateMessage);
router.delete("/:id", deleteMessage);

export default router;