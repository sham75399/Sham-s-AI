import { createContext, useContext, useState, useCallback } from "react";
import api from "../services/api";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const { data } = await api.get("/chats");
      setConversations(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load chats");
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId) => {
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/chats/${conversationId}/messages`);
      setMessages(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openConversation = useCallback(
    async (conv) => {
      setCurrentConversation(conv);
      setMessages([]);
      await fetchMessages(conv._id);
    },
    [fetchMessages]
  );

  const createConversation = useCallback(async () => {
    const { data } = await api.post("/chats");
    setConversations((prev) => [data, ...prev]);
    setCurrentConversation(data);
    setMessages([]);
    return data;
  }, []);

  const deleteConversation = useCallback(
    async (id) => {
      await api.delete(`/chats/${id}`);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (currentConversation?._id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    },
    [currentConversation]
  );

  const renameConversation = useCallback(async (id, title) => {
    const { data } = await api.put(`/chats/${id}`, { title });
    setConversations((prev) =>
      prev.map((c) => (c._id === id ? { ...c, title: data.title } : c))
    );
    if (currentConversation?._id === id) {
      setCurrentConversation((prev) => ({ ...prev, title: data.title }));
    }
  }, [currentConversation]);

  const sendMessage = useCallback(
    async (text, attachment = null, targetConvId = null) => {
      const convId = targetConvId || currentConversation?._id;
      if (!convId) return;
      setSending(true);
      setError(null);

      // Optimistic user message
      const tempUserMsg = {
        _id: `temp-${Date.now()}`,
        role: "user",
        content: text || "",
        attachment: attachment || null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      try {
        const { data } = await api.post("/chat", {
          conversationId: convId,
          message: text || "",
          attachment: attachment || null,
        });

        // Replace temp with saved user msg and add assistant
        setMessages((prev) => {
          const withoutTemp = prev.filter(
            (m) => m._id !== tempUserMsg._id
          );
          return [
            ...withoutTemp,
            data.userMessage || {
              _id: `u-${Date.now()}`,
              role: "user",
              content: text || "",
              attachment: attachment || null,
              createdAt: new Date().toISOString(),
            },
            {
              _id: data.assistantMessage._id,
              role: "assistant",
              content: data.assistantMessage.content,
              createdAt: data.assistantMessage.createdAt,
            },
          ];
        });

        // Update title in list if changed
        if (data.title) {
          setConversations((prev) =>
            prev.map((c) =>
              c._id === convId
                ? { ...c, title: data.title, updatedAt: new Date().toISOString() }
                : c
            )
          );
          setCurrentConversation((prev) =>
            prev?._id === convId ? { ...prev, title: data.title } : prev
          );
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Something went wrong while generating the response."
        );
        // Remove optimistic message on error
        setMessages((prev) =>
          prev.filter((m) => m._id !== tempUserMsg._id)
        );
        throw err;
      } finally {
        setSending(false);
      }
    },
    [currentConversation]
  );

  const regenerate = useCallback(async () => {
    if (!currentConversation) return;
    setSending(true);
    try {
      const { data } = await api.post("/chat/regenerate", {
        conversationId: currentConversation._id,
      });
      setMessages((prev) => {
        // Remove last assistant message
        const filtered = [...prev];
        for (let i = filtered.length - 1; i >= 0; i--) {
          if (filtered[i].role === "assistant") {
            filtered.splice(i, 1);
            break;
          }
        }
        return [
          ...filtered,
          {
            _id: data.assistantMessage._id,
            role: "assistant",
            content: data.assistantMessage.content,
            createdAt: data.assistantMessage.createdAt,
          },
        ];
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to regenerate response"
      );
    } finally {
      setSending(false);
    }
  }, [currentConversation]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        loadingConversations,
        loadingMessages,
        sending,
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
        setConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};