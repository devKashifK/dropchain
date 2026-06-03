export type Citation = {
  text: string;
  score: number;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export interface ChatSession {
  id: string;
  name: string;
  documentIngested: boolean;
  chunks: string[];
  messages: Message[];
  createdAt: number;
}
