
export type ModelType = 'AI-2' | 'AI-3';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  timestamp: number;
  sources?: { title: string; url: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export type Expression = 'happy' | 'thinking' | 'excited' | 'listening' | 'neutral';
