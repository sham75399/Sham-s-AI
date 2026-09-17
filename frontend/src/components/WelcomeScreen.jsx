const PROMPTS = [
  {
    title: "Explain a concept",
    sub: "Break down a complex topic in simple terms",
  },
  {
    title: "Write code",
    sub: "Help me build a React component",
  },
  {
    title: "Help with my project",
    sub: "Suggest architecture and best practices",
  },
  {
    title: "Generate ideas",
    sub: "Brainstorm creative project concepts",
  },
];

const WelcomeScreen = ({ onPromptClick }) => (
  <div className="welcome-screen">
    <div className="welcome-logo">S</div>
    <h1>Hello! I&apos;m Sham&apos;s AI.</h1>
    <p className="welcome-sub">How can I help you today?</p>

    <div className="prompt-cards">
      {PROMPTS.map((p) => (
        <button
          key={p.title}
          className="prompt-card"
          onClick={() => onPromptClick(p.title)}
        >
          <div className="prompt-title">{p.title}</div>
          <div className="prompt-sub">{p.sub}</div>
        </button>
      ))}
    </div>
  </div>
);

export default WelcomeScreen;