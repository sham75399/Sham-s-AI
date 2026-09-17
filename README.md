# 🚀 Sham's AI — Your Personal AI Assistant

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Groq](https://img.shields.io/badge/AI-Groq%20LLaMA%203.3-F55036)](https://groq.com/)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI%20Realtime-412991?logo=openai&logoColor=white)](https://openai.com/)

**Sham's AI** is a state-of-the-art, full-stack personal AI assistant application built with a modern MERN-architecture, Vite, Groq, and OpenAI. It delivers real-time conversational intelligence, ultra-low latency interactive voice mode (WebRTC), multimodal vision analysis, secure authentication, and conversation history in a sleek glassmorphic UI.

---

## ✨ Features

- 💬 **Intelligent Conversational AI**: Powered by Groq's high-speed LLaMA 3.3 70B (and compatible with OpenAI GPT-4o / custom endpoints) for ultra-fast, contextual responses.
- 🎙️ **Dual-Engine Interactive Voice Mode**:
  - **OpenAI Realtime WebRTC**: Ultra-low latency voice streaming with server-side Voice Activity Detection (VAD) and hands-free interruption handling.
  - **Conversational Voice Fallback**: High-accuracy speech recognition via Groq Whisper (`whisper-large-v3-turbo`) with Text-to-Speech (OpenAI TTS / Web Speech API) and real-time audio wave visualization.
- 👁️ **Multimodal Vision & File Attachments**: Attach and analyze images and documents alongside your text prompts.
- 🔐 **Authentication & Security**:
  - Secure JWT authentication and password hashing with `bcryptjs`.
  - Password recovery flow with automated email reset links (`nodemailer` / SMTP).
  - Protected routes, CORS configuration, API rate limiting (`express-rate-limit`), and HTTP security headers (`helmet`).
- 📂 **Persistent Conversation History**: Multi-session management allowing users to create, view, rename, search, and delete previous chat sessions stored in MongoDB.
- 🎨 **Modern Glassmorphic Dark UI**:
  - Responsive design crafted for both mobile and desktop.
  - Full Markdown rendering with syntax highlighting, language badges, and one-click code copying.
  - Interactive sidebar with collapsible drawer navigation and user status.
- 👤 **Customizable User Profile & Settings**:
  - Profile avatar upload and biography management.
  - Customizable theme preferences and AI model parameters.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 18](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Styling**: Vanilla CSS (Custom Design System with Glassmorphism, Micro-animations, and Dark Theme)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Markdown & Code**: `react-markdown`, `remark-gfm`, `react-syntax-highlighter`
- **Audio & Media**: WebRTC, Web Audio API, MediaRecorder

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose ODM](https://mongoosejs.com/)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
- **File Uploads**: `multer`
- **Security**: `helmet`, `cors`, `express-rate-limit`
- **Email**: `nodemailer`
- **AI Integrations**:
  - [Groq SDK / OpenAI SDK](https://github.com/openai/openai-node) (LLaMA 3.3 70B, Whisper Large v3 Turbo, Qwen Vision)
  - OpenAI Realtime Sessions API (WebRTC audio streaming)

---

## 📁 Project Structure

```text
shams-ai/
├── backend/
│   ├── config/
│   │   └── database.js            # MongoDB connection configuration
│   ├── controllers/
│   │   ├── authController.js       # Signup, login, password reset logic
│   │   ├── chatController.js       # Chat sessions & AI completion endpoints
│   │   ├── messageController.js    # Message retrieval & persistence
│   │   └── userController.js       # User profile & avatar management
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT verification & route protection
│   │   ├── errorMiddleware.js      # Global error handling & 404 handler
│   │   └── rateLimitMiddleware.js  # Express rate limiting
│   ├── models/
│   │   ├── Conversation.js         # Chat session schema
│   │   ├── Message.js              # Individual message schema
│   │   └── User.js                 # User profile & credential schema
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth
│   │   ├── chatRoutes.js           # /api/chats & /api/chat
│   │   ├── messageRoutes.js        # /api/messages
│   │   ├── uploadRoutes.js         # /api/upload
│   │   └── userRoutes.js           # /api/users
│   ├── services/
│   │   ├── audioService.js         # Whisper transcription & TTS
│   │   ├── openaiService.js        # Chat completions & vision processing
│   │   └── realtimeService.js      # OpenAI Realtime WebRTC session provisioning
│   ├── uploads/                    # Local storage for avatars & file attachments
│   ├── server.js                   # Express application entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInput.jsx       # Message composer, file uploader, mic trigger
│   │   │   ├── ChatMessage.jsx     # Markdown renderer, code highlighter, avatar
│   │   │   ├── ChatWindow.jsx      # Message feed and scroll anchor
│   │   │   ├── ConversationItem.jsx# Sidebar conversation list tile
│   │   │   ├── Sidebar.jsx         # Navigation drawer and session switcher
│   │   │   ├── VoiceModeModal.jsx  # Interactive WebRTC & continuous voice overlay
│   │   │   └── WelcomeScreen.jsx   # Hero banner with prompt suggestions
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Authentication state provider
│   │   ├── pages/
│   │   │   ├── Chat.jsx            # Core chat application page
│   │   │   ├── Landing.jsx         # Public landing page
│   │   │   ├── Login.jsx           # User sign-in
│   │   │   ├── Register.jsx        # Account registration
│   │   │   ├── ForgotPassword.jsx  # Password recovery request
│   │   │   ├── ResetPassword.jsx   # Token-based password reset
│   │   │   ├── Profile.jsx         # Profile avatar & info editor
│   │   │   └── Settings.jsx        # User settings & preferences
│   │   ├── services/
│   │   │   ├── api.js              # Axios instance & interceptors
│   │   │   └── chatService.js      # Chat & voice API helpers
│   │   ├── App.jsx                 # Route definitions & layout
│   │   ├── index.css               # Design system, glassmorphic styles, variables
│   │   └── main.jsx                # React DOM root
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **MongoDB** (Local instance or free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- **Groq API Key** (Get free at [console.groq.com](https://console.groq.com/)) OR **OpenAI API Key**

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/shams-ai.git
cd shams-ai
```

---

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Configure the environment variables in `backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/shamsai?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
   CLIENT_URL=http://localhost:5173

   # AI Provider (Groq — FREE Tier Recommended)
   AI_API_KEY=gsk_your_groq_api_key_here
   AI_BASE_URL=https://api.groq.com/openai/v1
   AI_MODEL=llama-3.3-70b-versatile

   # (Optional) OpenAI Realtime Voice Mode (WebRTC)
   # OPENAI_API_KEY=sk-your_openai_api_key_here
   # OPENAI_REALTIME_MODEL=gpt-4o-mini-realtime-preview-2024-12-17

   # (Optional) SMTP Email for Password Resets
   # SMTP_HOST=smtp.gmail.com
   # SMTP_PORT=587
   # SMTP_USER=your_email@gmail.com
   # SMTP_PASS=your_gmail_app_password
   # SMTP_FROM=Sham's AI <your_email@gmail.com>
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will be running at `http://localhost:5000`.*

---

### 3. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Verify the backend API URL in `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend will launch at `http://localhost:5173`.*

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description | Default |
| :--- | :---: | :--- | :--- |
| `PORT` | No | Port on which the Express server runs | `5000` |
| `MONGODB_URI` | **Yes** | Connection string for MongoDB database | — |
| `JWT_SECRET` | **Yes** | Secret string used to sign JSON Web Tokens | — |
| `CLIENT_URL` | No | Frontend client origin allowed by CORS | `http://localhost:5173` |
| `AI_API_KEY` | **Yes** | API key for LLM provider (Groq or OpenAI) | — |
| `AI_BASE_URL` | No | API endpoint base URL (e.g., `https://api.groq.com/openai/v1`) | Groq / OpenAI default |
| `AI_MODEL` | No | LLM model identifier | `llama-3.3-70b-versatile` |
| `AI_VISION_MODEL` | No | Multimodal model identifier | `qwen/qwen3.8-27b` or `gpt-4o` |
| `OPENAI_API_KEY` | No | Required for OpenAI Realtime Voice (WebRTC) & TTS | — |
| `OPENAI_REALTIME_MODEL` | No | Realtime audio preview model | `gpt-4o-mini-realtime-preview-2024-12-17` |
| `SMTP_HOST` | No | SMTP host for sending password reset emails | — (logged to console if unset) |
| `SMTP_PORT` | No | SMTP port (e.g., 587 or 465) | `587` |
| `SMTP_USER` | No | SMTP authentication username / email | — |
| `SMTP_PASS` | No | SMTP app password | — |
| `SMTP_FROM` | No | Sender address for outgoing emails | — |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Default |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | **Yes** | Base API URL pointing to the Express backend | `http://localhost:5000/api` |

---

## 🔌 API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Sign in and obtain JWT token
- `POST /api/auth/forgot-password` — Request password reset email / token
- `POST /api/auth/reset-password/:token` — Reset password using recovery token

### Chat & Conversations (`/api/chats`)
- `GET /api/chats` — Fetch all conversations for the authenticated user
- `POST /api/chats` — Create a new conversation session
- `GET /api/chats/:id` — Fetch a specific conversation
- `PUT /api/chats/:id` — Rename or update a conversation title
- `DELETE /api/chats/:id` — Delete a conversation and its messages

### AI & Messages (`/api/chat` & `/api/messages`)
- `POST /api/chat` — Send a message and stream / receive AI response
- `GET /api/messages/:conversationId` — Retrieve message history for a conversation
- `POST /api/chat/realtime-session` — Generate an ephemeral WebRTC session token for Realtime Voice
- `POST /api/chat/transcribe` — Transcribe voice recording via Groq Whisper (`whisper-large-v3-turbo`)
- `POST /api/chat/synthesize` — Synthesize speech via OpenAI TTS

### Users & Media (`/api/users` & `/api/upload`)
- `GET /api/users/profile` — Get current user profile details
- `PUT /api/users/profile` — Update username, email, or bio
- `POST /api/users/avatar` — Upload and update user avatar image
- `POST /api/upload` — Upload an attachment (image/document) for chat

---

## 🎙️ Interactive Voice Mode

Sham's AI offers an intelligent dual-engine voice experience:

1. **OpenAI Realtime WebRTC**:
   - If an `OPENAI_API_KEY` is provided, clicking the Voice icon connects directly to OpenAI's low-latency Realtime API via WebRTC.
   - Sessions use ephemeral authentication tokens generated by the backend to keep master API keys secure.
   - Supports natural interruptions, bidirectional audio streaming, and server VAD.

2. **Continuous Conversational Mode (Groq Whisper + TTS)**:
   - If no OpenAI key is configured, the system automatically falls back to an intelligent continuous voice loop.
   - Speech is captured via microphone and transcribed with Groq's high-speed Whisper Large v3 Turbo.
   - Responses are generated by LLaMA 3.3 70B and spoken back using the Web Speech API or OpenAI TTS.

---

## 📦 Build & Deployment

### Production Build

#### Backend
The backend runs directly via Node.js:
```bash
cd backend
npm start
```

#### Frontend
Compile the production-ready static assets:
```bash
cd frontend
npm run build
```
The optimized bundle will be generated in `frontend/dist/`, which can be served using static hosts like Vercel, Netlify, or directly by the Express backend.

---

## 🛡️ Security Best Practices

- **Never commit `.env` files**: All secrets (database credentials, JWT keys, API keys) must be kept strictly local or managed in deployment secret stores.
- **Strict CORS**: CORS is configured to only whitelist the frontend origin defined by `CLIENT_URL`.
- **Helmet Security**: Automatic HTTP headers protection preventing MIME sniffing, clickjacking, and XSS attacks.
- **Rate Limiting**: Protects sensitive endpoints (login, AI completion, transcription) against brute force and abuse.

---

## 👨‍💻 Author

Created with ❤️ by **Sham**.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
