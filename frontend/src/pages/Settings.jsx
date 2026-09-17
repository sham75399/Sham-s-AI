import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Sun, Moon, Monitor } from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useChat } from "../context/ChatContext";

const Settings = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { conversations, setConversations, setCurrentConversation, setMessages } = useChat();
  const navigate = useNavigate();

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [clearChatsOpen, setClearChatsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleClearChats = async () => {
    setBusy(true);
    setErr("");
    try {
      await Promise.all(
        conversations.map((c) => api.delete(`/chats/${c._id}`))
      );
      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
      setClearChatsOpen(false);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setBusy(true);
    setErr("");
    try {
      await api.delete("/users/account");
      logout();
      navigate("/");
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <Link to="/chat" className="back-btn">
          <ArrowLeft size={16} /> Back to Chat
        </Link>
        <h1>Settings</h1>
      </header>

      <div className="settings-content">
        {err && <div className="error-msg">{err}</div>}

        <div className="settings-section">
          <h2>Account</h2>
          <div className="settings-row">
            <div>
              <div className="label">{user?.name}</div>
              <div className="value">{user?.email}</div>
            </div>
            <Link to="/profile" className="settings-btn">
              Edit Profile
            </Link>
          </div>
          <div className="settings-row">
            <div className="label">Log out</div>
            <button
              className="settings-btn"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
          <div className="settings-row">
            <div className="label" style={{ color: "#dc2626" }}>
              Delete account
            </div>
            <button
              className="settings-btn danger"
              onClick={() => setDeleteAccountOpen(true)}
            >
              Delete
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>Appearance</h2>
          <div className="settings-row">
            <div className="label">Theme</div>
            <div className="theme-group">
              <button
                className={`theme-option ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                <Sun size={14} /> Light
              </button>
              <button
                className={`theme-option ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                <Moon size={14} /> Dark
              </button>
              <button
                className={`theme-option ${theme === "system" ? "active" : ""}`}
                onClick={() => setTheme("system")}
              >
                <Monitor size={14} /> System
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Chat</h2>
          <div className="settings-row">
            <div className="label">Clear all conversations</div>
            <button
              className="settings-btn danger"
              onClick={() => setClearChatsOpen(true)}
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>About</h2>
          <div className="settings-row">
            <div className="label">Sham&apos;s AI</div>
            <div className="value">v1.0.0</div>
          </div>
          <div className="settings-row">
            <div className="label">Tagline</div>
            <div className="value">Your Personal AI Assistant</div>
          </div>
          <div className="settings-row">
            <div className="label">Terms & Privacy</div>
            <div className="value">See documentation</div>
          </div>
        </div>
      </div>

      {clearChatsOpen && (
        <div className="modal-overlay" onClick={() => setClearChatsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Clear all conversations?</h3>
            <p>This permanently deletes every chat and message on your account.</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setClearChatsOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={handleClearChats}
              >
                {busy ? "Clearing…" : "Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteAccountOpen && (
        <div className="modal-overlay" onClick={() => setDeleteAccountOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete your account?</h3>
            <p>
              This will permanently remove your account, conversations and
              messages. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteAccountOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={handleDeleteAccount}
              >
                {busy ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;