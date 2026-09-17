import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Square,
  AlertCircle,
  RefreshCw,
  X,
  Radio,
  Sparkles,
} from "lucide-react";
import useRealtimeVoice from "../hooks/useRealtimeVoice";

const VoiceModeModal = ({ isOpen, onClose, conversationId, onTurnSaved }) => {
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const canvasRef = useRef(null);

  const {
    status,
    error,
    isMuted,
    mode,
    userTranscript,
    assistantTranscript,
    audioLevel,
    frequencies,
    connect,
    disconnect,
    interrupt,
    toggleMute,
  } = useRealtimeVoice({
    conversationId,
    onTurnSaved,
    voice: selectedVoice,
    language: selectedLanguage,
  });

  // Automatically start voice session when modal opens
  useEffect(() => {
    if (isOpen && status === "disconnected") {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle closing modal
  const handleClose = () => {
    disconnect();
    onClose();
  };

  // Canvas visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const renderVisualizer = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      const numBars = 36;
      const barWidth = 4;
      const spacing = (width - numBars * barWidth) / (numBars + 1);

      for (let i = 0; i < numBars; i++) {
        // Map bar index to frequency bin
        const freqIndex = Math.floor((i / numBars) * frequencies.length);
        const freqValue = frequencies[freqIndex] || 0;
        const normalized = freqValue / 255;

        // Base height modulated by frequency and overall audio level
        const wave = Math.sin(Date.now() / 400 + i * 0.3) * 0.2 + 0.8;
        let barHeight = (normalized * 0.7 + audioLevel * 0.3) * height * 0.75 * wave;
        barHeight = Math.max(barHeight, 6);

        const x = spacing + i * (barWidth + spacing);
        const y = centerY - barHeight / 2;

        // Dynamic gradients based on current voice status
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (status === "speaking") {
          gradient.addColorStop(0, "rgba(52, 211, 153, 0.9)");
          gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.85)");
          gradient.addColorStop(1, "rgba(147, 51, 234, 0.8)");
        } else if (status === "thinking") {
          gradient.addColorStop(0, "rgba(168, 85, 247, 0.85)");
          gradient.addColorStop(1, "rgba(236, 72, 153, 0.85)");
        } else if (status === "muted") {
          gradient.addColorStop(0, "rgba(245, 158, 11, 0.7)");
          gradient.addColorStop(1, "rgba(239, 68, 68, 0.7)");
        } else {
          // Listening / Idle
          gradient.addColorStop(0, "rgba(96, 165, 250, 0.85)");
          gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.75)");
          gradient.addColorStop(1, "rgba(14, 165, 233, 0.65)");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      animId = requestAnimationFrame(renderVisualizer);
    };

    renderVisualizer();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [frequencies, audioLevel, status]);

  if (!isOpen) return null;

  // Visual state styling helpers
  const getStatusLabel = () => {
    switch (status) {
      case "connecting":
        return "Connecting to Sham's AI...";
      case "listening":
        return isMuted ? "Microphone Muted" : "Listening… Speak anytime";
      case "thinking":
        return "Sham's AI is thinking…";
      case "speaking":
        return "Sham's AI is speaking…";
      case "muted":
        return "Microphone Muted";
      case "error":
        return "Connection Error";
      default:
        return "Ready";
    }
  };

  const getOrbColorClass = () => {
    if (status === "speaking") return "orb-speaking";
    if (status === "thinking") return "orb-thinking";
    if (status === "muted") return "orb-muted";
    if (status === "connecting") return "orb-connecting";
    return "orb-listening";
  };

  return (
    <div className="voice-modal-overlay" role="dialog" aria-modal="true">
      <div className="voice-modal-card">
        {/* Top Bar */}
        <header className="voice-modal-header">
          <div className="voice-brand">
            <span className="voice-live-dot" />
            <span className="voice-title">Sham&apos;s AI Voice Mode</span>
            <span className="voice-mode-badge">
              <Radio size={12} className="live-icon" />
              {mode === "webrtc" ? "OpenAI Realtime WebRTC" : "Continuous Voice"}
            </span>
          </div>

          <div className="voice-header-actions">
            {/* Language Selection */}
            <select
              className="voice-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              title="Select Conversation Language"
              aria-label="Select Language"
            >
              <option value="auto">🌐 Auto-Detect Language</option>
              <option value="hi-IN">🇮🇳 Hindi (हिन्दी)</option>
              <option value="en-IN">🇮🇳 English (India)</option>
              <option value="en-US">🇺🇸 English (US)</option>
              <option value="ta-IN">🇮🇳 Tamil (தமிழ்)</option>
              <option value="te-IN">🇮🇳 Telugu (తెలుగు)</option>
              <option value="ur-IN">🇮🇳 Urdu (اردو)</option>
              <option value="bn-IN">🇮🇳 Bengali (বাংলা)</option>
              <option value="mr-IN">🇮🇳 Marathi (मराठी)</option>
              <option value="gu-IN">🇮🇳 Gujarati (ગુજરાતી)</option>
              <option value="kn-IN">🇮🇳 Kannada (ಕನ್ನಡ)</option>
              <option value="ml-IN">🇮🇳 Malayalam (മലയാളം)</option>
              <option value="ar-SA">🇸🇦 Arabic (العربية)</option>
              <option value="es-ES">🇪🇸 Spanish (Español)</option>
              <option value="fr-FR">🇫🇷 French (Français)</option>
              <option value="de-DE">🇩🇪 German (Deutsch)</option>
            </select>

            {mode === "webrtc" && (
              <select
                className="voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={status !== "disconnected" && status !== "error"}
                title="Select Voice Character"
              >
                <option value="alloy">Alloy (Balanced)</option>
                <option value="echo">Echo (Warm)</option>
                <option value="fable">Fable (Expressive)</option>
                <option value="onyx">Onyx (Deep)</option>
                <option value="nova">Nova (Energetic)</option>
                <option value="shimmer">Shimmer (Clear)</option>
              </select>
            )}
            <button
              className="voice-close-btn"
              onClick={handleClose}
              aria-label="Close voice mode"
              title="Close Voice Mode"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Center Stage: Visualizer & Reactive Orb */}
        <div className="voice-stage">
          {error ? (
            <div className="voice-error-card">
              <AlertCircle size={36} color="#ef4444" />
              <h4>Unable to connect</h4>
              <p>{error}</p>
              <button className="btn voice-retry-btn" onClick={connect}>
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          ) : (
            <div className="voice-visualizer-container">
              {/* Pulsing Luminous Orb */}
              <div
                className={`voice-orb ${getOrbColorClass()}`}
                style={{
                  transform: `scale(${1 + audioLevel * 0.45})`,
                  boxShadow: `0 0 ${40 + audioLevel * 80}px ${
                    status === "speaking"
                      ? "rgba(52, 211, 153, 0.65)"
                      : status === "thinking"
                      ? "rgba(168, 85, 247, 0.65)"
                      : "rgba(59, 130, 246, 0.55)"
                  }`,
                }}
              >
                <div className="orb-inner-core">
                  <Sparkles size={28} className="orb-sparkle" />
                </div>
                <div className="orb-ripple ring-1" />
                <div className="orb-ripple ring-2" />
                <div className="orb-ripple ring-3" />
              </div>

              {/* Status Badge */}
              <div className={`voice-status-pill ${status}`}>
                <span className="status-indicator-dot" />
                {getStatusLabel()}
              </div>

              {/* Dynamic Sound Wave Canvas */}
              <canvas
                ref={canvasRef}
                width={360}
                height={70}
                className="voice-frequency-canvas"
              />
            </div>
          )}

          {/* Live Subtitle Transcript Feed */}
          <div className="voice-transcripts">
            {userTranscript && (
              <div className="voice-transcript-bubble user">
                <span className="speaker-tag">You:</span>
                <p>{userTranscript}</p>
              </div>
            )}

            {assistantTranscript && (
              <div className="voice-transcript-bubble assistant">
                <span className="speaker-tag">Sham&apos;s AI:</span>
                <p>{assistantTranscript}</p>
              </div>
            )}

            {!userTranscript && !assistantTranscript && !error && (
              <div className="voice-hint-text">
                Start speaking naturally. Sham&apos;s AI listens and responds in real time.
                You can speak over the AI anytime to interrupt.
              </div>
            )}
          </div>
        </div>

        {/* Bottom Control Dock */}
        <footer className="voice-controls-dock">
          {/* Mute Button */}
          <button
            className={`voice-dock-btn ${isMuted ? "muted" : ""}`}
            onClick={toggleMute}
            disabled={status === "connecting" || !!error}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff size={22} color="#ef4444" /> : <Mic size={22} />}
            <span className="btn-label">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Interrupt / Barge-In Button */}
          <button
            className="voice-dock-btn interrupt-btn"
            onClick={interrupt}
            disabled={status !== "speaking"}
            title="Interrupt AI speech"
            aria-label="Interrupt AI speech"
          >
            <Square size={20} fill="currentColor" />
            <span className="btn-label">Interrupt</span>
          </button>

          {/* End Conversation Button */}
          <button
            className="voice-dock-btn end-btn"
            onClick={handleClose}
            title="End voice conversation"
            aria-label="End conversation and return to chat"
          >
            <PhoneOff size={22} />
            <span className="btn-label">End</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default VoiceModeModal;
