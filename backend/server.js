import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes, { aiRouter } from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { apiLimiter, aiLimiter } from "./middleware/rateLimitMiddleware.js";

// __dirname equivalent for ESM on Windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// -------------------- Security --------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// -------------------- CORS --------------------
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (Postman, mobile apps)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// -------------------- Body parsers --------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// -------------------- Static files (uploads) --------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------- Rate limiting --------------------
app.use("/api", apiLimiter);

// -------------------- Health check --------------------
app.get("/", (req, res) => {
  res.json({ message: "Sham's AI API is running 🚀" });
});

// -------------------- Routes --------------------
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/chat", aiLimiter, aiRouter);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);

// -------------------- Error handling --------------------
app.use(notFound);
app.use(errorHandler);

// -------------------- Start server --------------------
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Sham's AI backend running on port ${PORT}`);
  });
});