import { Link } from "react-router-dom";
import {
  MessageSquare,
  Zap,
  History,
  ShieldCheck,
  Paperclip,
  Cloud,
} from "lucide-react";

const FEATURES = [
  {
    icon: <MessageSquare size={22} />,
    title: "Intelligent Conversations",
    desc: "Natural, context-aware dialogue powered by state-of-the-art AI models.",
  },
  {
    icon: <Zap size={22} />,
    title: "Fast AI Responses",
    desc: "Get answers in seconds with an optimized streaming-ready backend.",
  },
  {
    icon: <History size={22} />,
    title: "Conversation History",
    desc: "Every chat is saved and searchable so you never lose an idea.",
  },
  {
    icon: <ShieldCheck size={22} />,
    title: "Secure Authentication",
    desc: "Passwords hashed with bcrypt and sessions protected by JWT.",
  },
  {
    icon: <Paperclip size={22} />,
    title: "File & Image Support",
    desc: "Attach PDFs, images and documents to get richer, context-aware answers.",
  },
  {
    icon: <Cloud size={22} />,
    title: "Cloud Based",
    desc: "Access your conversations anywhere, on any device — always in sync.",
  },
];

const Landing = () => (
  <div className="landing">
    <header className="landing-header">
      <div className="brand">
        <div className="brand-icon">S</div>
        Sham&apos;s AI
      </div>
      <nav className="landing-nav">
        <a href="#home">Home</a>
        <a href="#features">Features</a>
        <a href="#about">About</a>
        <Link to="/login">Login</Link>
        <Link to="/register" className="btn" style={{ width: "auto", padding: "9px 18px" }}>
          Get Started
        </Link>
      </nav>
    </header>

    <section className="landing-hero" id="home">
      <h1>
        Meet <span>Sham&apos;s AI</span>
      </h1>
      <p className="tagline">Your Personal AI Assistant</p>
      <p className="description">
        Ask questions, explore ideas, write content, understand complex topics
        and get intelligent AI assistance in one place.
      </p>
      <div className="hero-buttons">
        <Link to="/register" className="btn">
          Start Chatting
        </Link>
        <Link to="/login" className="btn btn-secondary">
          Login
        </Link>
      </div>
    </section>

    <section className="landing-features" id="features">
      <h2>Powerful Features</h2>
      <p className="section-sub">Everything you need for a modern AI experience</p>
      <div className="features-grid">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="landing-about" id="about">
      <div className="about-content">
        <div className="about-copy">
          <p className="eyebrow">About</p>
          <h2>Built to help people think clearly and create faster.</h2>
          <p>
            Sham&apos;s AI is a streamlined assistant designed to turn ideas into action.
            Whether you are brainstorming, learning, writing, or solving a problem,
            it brings conversational intelligence and context-aware support into a single,
            easy-to-use workspace.
          </p>
          <p>
            The platform is built for real everyday productivity: quick answers, secure
            conversations, organized history, and a clean experience that works across devices.
          </p>
        </div>

        <div className="about-points">
          <div className="about-point">
            <strong>Smart & Focused</strong>
            <span>Helpful guidance for research, writing, and daily problem-solving.</span>
          </div>
          <div className="about-point">
            <strong>Always Accessible</strong>
            <span>Continue your work from anywhere with saved history and synchronized chats.</span>
          </div>
          <div className="about-point">
            <strong>Built for Trust</strong>
            <span>Secure login, protected sessions, and a clean experience for personal use.</span>
          </div>
        </div>
      </div>
    </section>

    <footer className="landing-footer">
      <div className="brand">
        <div className="brand-icon">S</div>
        Sham&apos;s AI · Your Personal AI Assistant
      </div>
      <div className="footer-links">
        <a href="#features">Features</a>
        <a href="#about">About</a>
        <Link to="/login">Login</Link>
        <Link to="/register">Sign Up</Link>
      </div>
      <div>© {new Date().getFullYear()} Sham&apos;s AI</div>
    </footer>
  </div>
);

export default Landing;