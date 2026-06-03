import { useApp } from "../context/AppContext";
import { Plus, MessageSquare, Trash2, ArrowLeft, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import DocumentSetup from "./DocumentSetup";

interface SidebarProps {
  isCreating: boolean;
  setIsCreating: (val: boolean) => void;
  onNewChat: () => void;
  onCloseMobile?: () => void;
}

export function Sidebar({ isCreating, setIsCreating, onNewChat, onCloseMobile }: SidebarProps) {
  const {
    sessions,
    activeSessionId,
    switchSession,
    startNewSession,
    deleteSession,
    renameSession
  } = useApp();

  const [showChatsList, setShowChatsList] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // When active session changes, show chunks/doc setup view in the sidebar by default
  useEffect(() => {
    if (activeSessionId) {
      setShowChatsList(false);
    }
  }, [activeSessionId]);

  // When starting a new creation flow, show the upload form in the sidebar
  useEffect(() => {
    if (isCreating) {
      setShowChatsList(false);
    }
  }, [isCreating]);

  // Determine what to show in the sidebar:
  // We show DocumentSetup if:
  // - we are creating a new chat (isCreating is true)
  // - OR a chat is active (activeSessionId is set) AND the user hasn't clicked "Back to Chats" (showChatsList is false)
  const showDocumentView = (isCreating || activeSessionId) && !showChatsList;

  if (showDocumentView) {
    return (
      <div className="w-full flex flex-col h-full bg-card">
        {/* Header with Back button */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sessions.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreating(false);
                setShowChatsList(true);
                // Don't auto-close mobile sidebar here since we are just opening chat list within sidebar
              }}
              className="cursor-pointer gap-2 text-xs text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Chats
            </Button>
          ) : (
            <span className="text-xs font-semibold text-foreground pl-2">Get Started</span>
          )}
          {activeSessionId ? (
            <Button
              onClick={() => {
                startNewSession();
                onNewChat();
              }}
              className="flex items-center justify-center gap-1 cursor-pointer text-[10px] font-medium h-7 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
            >
              <Plus className="w-3 h-3" />
              New Chat
            </Button>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground pr-2">New Chat</span>
          )}
        </div>
        
        {/* Scrollable Document Setup (Uploader / Chunks) */}
        <div className="flex-grow overflow-y-auto p-4 min-h-0">
          <DocumentSetup onUploaded={onCloseMobile} />
        </div>
      </div>
    );
  }

  // Chats List View
  return (
    <div className="w-full bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between gap-3">
        <h2 className="font-semibold text-sm tracking-tight text-foreground">Conversations</h2>
        <Button
          onClick={() => {
            startNewSession();
            onNewChat();
          }}
          className="flex items-center justify-center gap-1.5 cursor-pointer text-xs h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <div className="text-center p-8 text-sm text-muted-foreground">
            No past chats. Click <span className="font-medium text-foreground">New</span> to start!
          </div>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => {
              if (editingSessionId !== session.id) {
                switchSession(session.id);
                setShowChatsList(false);
                onCloseMobile?.();
              }
            }}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
              activeSessionId === session.id
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-muted-foreground"
            }`}
          >
            {editingSessionId === session.id ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renameSession(session.id, editName);
                      setEditingSessionId(null);
                    } else if (e.key === "Escape") {
                      setEditingSessionId(null);
                    }
                  }}
                  autoFocus
                  className="bg-background text-foreground border border-border rounded px-2 py-0.5 text-xs w-full focus:outline-hidden focus:ring-1 focus:ring-primary min-w-0"
                />
                <button
                  onClick={() => {
                    renameSession(session.id, editName);
                    setEditingSessionId(null);
                  }}
                  className="text-emerald-500 hover:text-emerald-600 p-0.5 cursor-pointer shrink-0"
                  title="Save Name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingSessionId(null)}
                  className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer shrink-0"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {session.name}
                  </span>
                </div>
                <div className="flex items-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(session.id);
                      setEditName(session.name);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 opacity-0 group-hover:opacity-100 mr-0.5 cursor-pointer"
                    title="Rename Chat"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
