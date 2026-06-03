import ChatInterface from "./components/ChatInterface";
import { TopBar } from "./components/TopBar";
import { ApiErrorDialog } from "./components/ApiErrorDialog";
import { Sidebar } from "./components/Sidebar";
import { useApp } from "./context/AppContext";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function App() {
  const { activeSessionId, startNewSession, sessions, switchSession } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarRef = useRef<any>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // If there are no sessions, automatically default to uploader mode
  useEffect(() => {
    if (sessions.length === 0) {
      setIsCreating(true);
    }
  }, [sessions.length]);

  // If a session becomes active, we are no longer creating
  useEffect(() => {
    if (activeSessionId) {
      setIsCreating(false);
    }
  }, [activeSessionId]);

  // Force layout default size on mount to workaround react-resizable-panels 0-width collapse bug
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sidebarRef.current) {
        try {
          sidebarRef.current.resize("25%");
        } catch (e) {
          console.error("Failed to resize sidebar on mount", e);
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleStartNew = () => {
    startNewSession(); // clear active session
    setIsCreating(true);
  };

  const handleCloseMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const mainContent = (
    <div className="h-full flex flex-col relative overflow-y-auto bg-background">
      {!activeSessionId ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
            <MessageSquare className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-semibold">Welcome to Dropchain Chat</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            {isCreating
              ? "Upload a document or paste text in the sidebar to start your conversation."
              : "Select a previous chat from the sidebar to continue, or start a new conversation."}
          </p>
          {!isCreating && (
            <Button onClick={handleStartNew} size="lg" className="cursor-pointer">
              <Plus className="w-5 h-5 mr-2" />
              Start New Chat
            </Button>
          )}

          {isMobile && !isCreating && sessions.length > 0 && (
            <div className="w-full max-w-xs flex flex-col gap-2 mt-4 animate-in fade-in duration-300">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left px-1">
                Recent Chats
              </div>
              {sessions.slice(0, 2).map((session) => (
                <button
                  key={session.id}
                  onClick={() => switchSession(session.id)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-card hover:bg-accent/30 text-left text-sm text-foreground transition-all cursor-pointer shadow-xs"
                >
                  <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate font-medium flex-1">{session.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-full">
          <ChatInterface />
        </div>
      )}
    </div>
  );

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-background text-foreground font-sans">
      <TopBar
        showMenuButton={isMobile}
        onToggleSidebar={() => setMobileSidebarOpen(true)}
      />

      {isMobile ? (
        <div className="flex-grow w-full relative overflow-hidden flex">
          {/* Main Content Area */}
          <div className="flex-1 h-full overflow-hidden">
            {mainContent}
          </div>

          {/* Mobile Sidebar Backdrop Overlay */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
              onClick={handleCloseMobileSidebar}
            />
          )}

          {/* Sliding Sidebar Drawer */}
          <div
            className="fixed inset-y-0 left-0 w-[280px] sm:w-[320px] bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out"
            style={{ transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)" }}
          >
            <Sidebar
              isCreating={isCreating}
              setIsCreating={setIsCreating}
              onNewChat={handleStartNew}
              onCloseMobile={handleCloseMobileSidebar}
            />
          </div>
        </div>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 w-full border-t border-border"
        >
          <ResizablePanel
            ref={sidebarRef}
            id="sidebar-panel"
            defaultSize="25%"
            minSize="20%"
            maxSize="40%"
          >
            <div className="h-full bg-card flex flex-col">
              <Sidebar
                isCreating={isCreating}
                setIsCreating={setIsCreating}
                onNewChat={handleStartNew}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            id="main-content-panel"
            defaultSize="75%"
          >
            {mainContent}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <ApiErrorDialog />
    </div>
  );
}
