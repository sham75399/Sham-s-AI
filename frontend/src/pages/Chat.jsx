import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import VoiceModeModal from "../components/VoiceModeModal";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const Chat = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    conversations,
    currentConversation,
    messages,
    sending,
    loadingMessages,
    error,
    setError,
    fetchConversations,
    fetchMessages,
    openConversation,
    createConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
    regenerate,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleOpenVoiceMode = async () => {
    if (!currentConversation) {
      try {
        await createConversation();
      } catch {
        setError("Could not create a conversation for Voice Mode");
        return;
      }
    }
    setVoiceModeOpen(true);
  };

  const handleVoiceTurnSaved = async () => {
    if (currentConversation?._id) {
      await fetchMessages(currentConversation._id);
    }
  };

  const handleNewChat = async () => {
    try {
      await createConversation();
      setSidebarOpen(false);
    } catch {
      setError("Could not create a new chat");
    }
  };

  const handleOpenChat = async (chat) => {
    await openConversation(chat);
    setSidebarOpen(false);
  };

  const handleSend = async (text, attachment = null) => {
    if (!currentConversation) {
      try {
        const conv = await createConversation();
        await sendMessage(text, attachment, conv?._id);
      } catch {
        setError("Could not send message");
      }
      return;
    }
    try {
      await sendMessage(text, attachment);
    } catch {
      /* handled in context */
    }
  };

  const handleRenameOpen = (chat) => {
    setRenameTarget(chat);
    setRenameValue(chat.title);
  };

  const handleRenameSave = async () => {
    if (!renameTarget) return;
    const title = renameValue.trim();
    if (!title) return;
    try {
      await renameConversation(renameTarget._id, title);
    } catch {
      setError("Could not rename conversation");
    }
    setRenameTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteConversation(deleteTarget._id);
    } catch {
      setError("Could not delete conversation");
    }
    setDeleteTarget(null);
  };

  const handleProfile = () => {
    setSidebarOpen(false);
    navigate("/profile");
  };

  const handleSettings = () => {
    setSidebarOpen(false);
    navigate("/settings");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="chat-layout">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        currentId={currentConversation?._id}
        onNewChat={handleNewChat}
        onOpenChat={handleOpenChat}
        onRename={handleRenameOpen}
        onDelete={setDeleteTarget}
        user={user}
        onOpenProfile={handleProfile}
        onOpenSettings={handleSettings}
      />

      <ChatWindow
        conversation={currentConversation}
        messages={messages}
        sending={sending}
        loadingMessages={loadingMessages}
        onSend={handleSend}
        onRegenerate={regenerate}
        onStop={() => {}}
        onMenuToggle={() => setSidebarOpen(true)}
        onOpenVoiceMode={handleOpenVoiceMode}
      />

      <VoiceModeModal
        isOpen={voiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        conversationId={currentConversation?._id}
        onTurnSaved={handleVoiceTurnSaved}
      />

      {error && (
        <div
          className="error-msg"
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 300,
            maxWidth: 320,
            cursor: "pointer",
          }}
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}

      {renameTarget && (
        <div className="modal-overlay" onClick={() => setRenameTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Rename conversation</h3>
            <p>Enter a new title for this conversation.</p>
            <input
              className="modal-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setRenameTarget(null)}
              >
                Cancel
              </button>
              <button className="btn" onClick={handleRenameSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete conversation?</h3>
            <p>
              &ldquo;{deleteTarget.title}&rdquo; and all its messages will be
              permanently removed.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;