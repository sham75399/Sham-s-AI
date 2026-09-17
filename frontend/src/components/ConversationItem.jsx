import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const ConversationItem = ({ chat, active, onOpen, onRename, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      className={`conv-item ${active ? "active" : ""}`}
      onClick={() => onOpen(chat)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(chat)}
      style={{ position: "relative" }}
    >
      <span className="conv-item-title">{chat.title}</span>
      <button
        className="conv-item-more"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        aria-label="Conversation options"
      >
        <MoreHorizontal size={16} />
      </button>

      {menuOpen && (
        <div className="conv-menu" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setMenuOpen(false);
              onRename(chat);
            }}
          >
            <Pencil size={14} /> Rename
          </button>
          <button
            className="danger"
            onClick={() => {
              setMenuOpen(false);
              onDelete(chat);
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversationItem;