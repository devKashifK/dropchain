import { FileSearch } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import { useApp } from "../context/AppContext";

export default function ChatInterface() {
  const {
    documentIngested,
    messages,
    isQuerying,
    question,
    setQuestion,
    handleQuery,
    chatEndRef,
  } = useApp();

  const onQuery = handleQuery;

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-background relative">
      {!documentIngested && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xs z-10 flex items-center justify-center">
          <div className="text-center p-6 max-w-sm">
            <FileSearch className="w-12 h-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
            <h2 className="text-xl font-medium text-foreground mb-2">Awaiting Document</h2>
            <p className="text-muted-foreground text-sm">Please ingest a document from the left panel to start chatting with it.</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.length === 0 && documentIngested && (
            <div className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Document ingested successfully. Ask a question to begin!
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}

          {isQuerying && <TypingIndicator />}

          <div ref={chatEndRef} />
        </div>
      </div>

      <ChatInput
        question={question}
        setQuestion={setQuestion}
        onQuery={onQuery}
        documentIngested={documentIngested}
        isQuerying={isQuerying}
      />
    </div>
  );
}
