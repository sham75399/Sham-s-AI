import express from "express";
import {
  updateProfile,
  updatePassword,
  deleteAccount,
  searchChats,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);

router.put("/profile", updateProfile);
router.put("/password", updatePassword);
router.delete("/account", deleteAccount);
router.get("/search/chats", searchChats);

export default router;