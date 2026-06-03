import { ThemeToggle } from "./ThemeToggle"
import { SettingsModal } from "./SettingsModal"
import { Bot, Download, Menu } from "lucide-react"
import { useApp } from "../context/AppContext"
import { Button } from "@/components/ui/button"
import { exportChatToPDF } from "../lib/pdfExport"

interface TopBarProps {
  showMenuButton?: boolean
  onToggleSidebar?: () => void
}

export function TopBar({ showMenuButton, onToggleSidebar }: TopBarProps) {
  const { activeSessionId, sessions } = useApp()
  const activeSession = sessions.find(s => s.id === activeSessionId)
  const hasMessages = activeSession && activeSession.messages && activeSession.messages.length > 0

  const handleExport = () => {
    if (activeSession) {
      exportChatToPDF(activeSession.name, activeSession.messages)
    }
  }

  return (
    <div className="w-full h-14 border-b border-border bg-background flex items-center justify-between px-4 md:px-6 shrink-0 z-50">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden w-9 h-9 mr-1 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Bot className="w-5 h-5 text-primary" />
        <h1 className="font-semibold text-lg tracking-tight">Dropchain Chat</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {hasMessages && (
          <Button
            onClick={handleExport}
            size="sm"
            className="cursor-pointer gap-2 h-9 hover:bg-accent text-xs px-2.5 sm:px-3 rounded-full"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Chat</span>
          </Button>
        )}
        <SettingsModal />
        <ThemeToggle />
      </div>
    </div>
  )
}
