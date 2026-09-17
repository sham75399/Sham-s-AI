import { useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import ConversationItem from "./ConversationItem";
import { groupConversations } from "../utils/formatDate";

const Sidebar = ({
  open,
  onClose,
  conversations,
  currentId,
  onNewChat,
  onOpenChat,
  onRename,
  onDelete,
  user,
  onOpenSettings,
  onOpenProfile,
}) => {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(conversations);

  // Debounced filter
  useEffect(() => {
    const t = setTimeout(() => {
      if (!query.trim()) {
        setFiltered(conversations);
      } else {
        const q = query.toLowerCase();
        setFiltered(
          conversations.filter((c) =>
            (c.title || "").toLowerCase().includes(q)
          )
        );
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, conversations]);

  const grouped = groupConversations(filtered);

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">S</div>
            Sham&apos;s AI
          </div>
          <button
            className="menu-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={onNewChat}>
          <Plus size={16} /> New Chat
        </button>

        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search conversations"
          />
        </div>

        <div className="sidebar-list">
          {filtered.length === 0 && (
            <div className="empty-state">
              <p>No conversations found</p>
            </div>
          )}

          {Object.entries(grouped).map(([label, chats]) =>
            chats.length > 0 ? (
              <div key={label}>
                <div className="sidebar-section-label">{label}</div>
                {chats.map((c) => (
                  <ConversationItem
                    key={c._id}
                    chat={c}
                    active={currentId === c._id}
                    onOpen={onOpenChat}
                    onRename={onRename}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            ) : null
          )}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={onOpenProfile}>
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button
            className="settings-btn"
            style={{ width: "100%", marginTop: 6 }}
            onClick={onOpenSettings}
          >
            Settings
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;