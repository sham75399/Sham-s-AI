import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  uploadSingle,
  handleUploadErrors,
} from "../middleware/uploadMiddleware.js";

const router = express.Router();
router.use(protect);

// POST /api/upload  (multipart/form-data, field name: "file")
router.post(
  "/",
  (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.json({
      message: "File uploaded successfully",
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
      },
    });
  }
);

export default router;