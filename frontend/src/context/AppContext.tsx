import { createContext, useContext, useState, useRef, useEffect, type ReactNode, type RefObject } from "react";
import type { Message, ChatSession } from "../types";

export type ProviderType = "gemini" | "openai";

interface AppContextType {
  // Derived state from active session
  documentIngested: boolean;
  chunks: string[];
  messages: Message[];
  
  // Session Management
  sessions: ChatSession[];
  activeSessionId: string | null;
  switchSession: (id: string) => void;
  startNewSession: () => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, newName: string) => void;

  isIngesting: boolean;
  isQuerying: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  question: string;
  setQuestion: (q: string) => void;
  chatEndRef: RefObject<HTMLDivElement | null>;
  handleIngest: (selectedFile: File | null, rawText: string) => Promise<void>;
  handleQuery: () => Promise<void>;

  // Custom API Key & Provider logic
  provider: ProviderType;
  setProvider: (val: ProviderType) => void;
  customApiKey: string;
  setCustomApiKey: (val: string) => void;
  authError: string | null;
  clearAuthError: () => void;
  revertToDefaultKey: () => void;
  clearSession: () => void; // alias for startNewSession for backwards compatibility
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("dropchain-sessions");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return localStorage.getItem("dropchain-active-session") || null;
  });

  const [isIngesting, setIsIngesting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings State
  const [provider, setProviderState] = useState<ProviderType>(() => {
    return (localStorage.getItem("dropchain-provider") as ProviderType) || "gemini";
  });
  const [customApiKey, setCustomApiKeyState] = useState<string>(() => {
    return localStorage.getItem("dropchain-apikey") || "";
  });
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("dropchain-sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem("dropchain-active-session", activeSessionId);
    } else {
      localStorage.removeItem("dropchain-active-session");
    }
  }, [activeSessionId]);

  // Derived state for current session
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const documentIngested = activeSession?.documentIngested || false;
  const chunks = activeSession?.chunks || [];
  const messages = activeSession?.messages || [];

  const switchSession = (id: string) => {
    setActiveSessionId(id);
    setError(null);
  };

  const startNewSession = () => {
    setActiveSessionId(null);
    setError(null);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
  };

  const renameSession = (id: string, newName: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, name: newName.trim() || s.name } : s
    ));
  };

  const setProvider = (val: ProviderType) => {
    setProviderState(val);
    localStorage.setItem("dropchain-provider", val);
    // Providers don't necessarily clear sessions now, but vectors on backend might differ.
  };

  const setCustomApiKey = (val: string) => {
    setCustomApiKeyState(val);
    localStorage.setItem("dropchain-apikey", val);
  };

  const revertToDefaultKey = () => {
    setCustomApiKeyState("");
    localStorage.removeItem("dropchain-apikey");
    setAuthError(null);
  };

  const clearAuthError = () => setAuthError(null);

  const [question, setQuestion] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isQuerying]);

  const handleIngest = async (selectedFile: File | null, rawText: string) => {
    setIsIngesting(true);
    setError(null);
    setAuthError(null);

    // Create a new session for this document
    const newSessionId = generateId();
    let sessionName = "New Chat";
    if (selectedFile) {
      sessionName = selectedFile.name;
    } else if (rawText.trim()) {
      const firstLine = rawText.trim().split("\n")[0].trim();
      sessionName = firstLine.length > 40 ? firstLine.substring(0, 40) + "..." : firstLine;
    }
    
    const newSession: ChatSession = {
      id: newSessionId,
      name: sessionName,
      documentIngested: false,
      chunks: [],
      messages: [],
      createdAt: Date.now()
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);

    try {
      let body: FormData | string;
      let headers: HeadersInit = {};

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        body = formData;
      } else {
        body = JSON.stringify({ text: rawText });
        headers["Content-Type"] = "application/json";
      }

      // Inject custom headers
      headers["x-provider"] = provider;
      headers["x-chat-id"] = newSessionId;
      if (customApiKey.trim()) {
        headers["x-api-key"] = customApiKey.trim();
      }

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/ingest`, {
        method: "POST",
        headers,
        body,
      });

      const data = await res.json();
      if (data.isAuthError) {
        setAuthError(data.error || "Authentication failed.");
        throw new Error("AUTH_ERROR");
      }

      if (!res.ok) {
        throw new Error(data.error || `Ingest failed with status ${res.status}`);
      }

      if (data.success) {
        setSessions(prev => prev.map(s => 
          s.id === newSessionId ? { ...s, documentIngested: true, chunks: data.chunks || [] } : s
        ));
      } else {
        throw new Error(data.message || "Failed to ingest document");
      }
    } catch (err: any) {
      if (err.message !== "AUTH_ERROR") {
        setError(err.message || "An unknown error occurred during ingestion.");
      }
      // Clean up failed session
      setSessions(prev => prev.filter(s => s.id !== newSessionId));
      setActiveSessionId(null);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleQuery = async () => {
    if (!question.trim() || !activeSessionId) return;

    const userMsg = question.trim();
    
    // Add user message
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, messages: [...s.messages, { role: "user", content: userMsg }] } : s
    ));
    
    setQuestion("");
    setIsQuerying(true);
    setError(null);
    setAuthError(null);

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      headers["x-provider"] = provider;
      headers["x-chat-id"] = activeSessionId;
      
      if (customApiKey.trim()) {
        headers["x-api-key"] = customApiKey.trim();
      }

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({ question: userMsg }),
      });

      const data = await res.json();

      if (data.isAuthError) {
        setAuthError(data.error || "Authentication failed.");
        throw new Error("AUTH_ERROR");
      }

      if (!res.ok) {
        throw new Error(data.error || `Query failed with status ${res.status}`);
      }

      // Add assistant message
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { 
          ...s, 
          messages: [
            ...s.messages, 
            {
              role: "assistant",
              content: data.answer || "No answer provided.",
              citations: data.citations,
            }
          ] 
        } : s
      ));
    } catch (err: any) {
      if (err.message !== "AUTH_ERROR") {
        setError(err.message || "An unknown error occurred during querying.");
        setSessions(prev => prev.map(s => 
          s.id === activeSessionId ? { 
            ...s, 
            messages: [...s.messages, { role: "assistant", content: "Sorry, I encountered an error while answering your question." }] 
          } : s
        ));
      } else {
        setSessions(prev => prev.map(s => 
          s.id === activeSessionId ? { 
            ...s, 
            messages: [...s.messages, { role: "assistant", content: "Your request was blocked due to an API Key authentication error." }] 
          } : s
        ));
      }
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        documentIngested,
        chunks,
        messages,
        sessions,
        activeSessionId,
        switchSession,
        startNewSession,
        deleteSession,
        renameSession,
        isIngesting,
        isQuerying,
        error,
        setError,
        question,
        setQuestion,
        chatEndRef,
        handleIngest,
        handleQuery,
        provider,
        setProvider,
        customApiKey,
        setCustomApiKey,
        authError,
        clearAuthError,
        revertToDefaultKey,
        clearSession: startNewSession
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
