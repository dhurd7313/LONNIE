import type { ToolCall } from "../lib/tools";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  model?: string;
  tokens?: number;
  imageData?: string; // base64 for image attachments
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
  systemPrompt?: string;
}

export interface AgentSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enabledTools: string[];
  autoExecuteTools: boolean;
  streamResponses: boolean;
  ollamaUrl: string;
}

export interface ConnectionStatus {
  connected: boolean;
  checking: boolean;
  lastChecked: number;
  error?: string;
}
