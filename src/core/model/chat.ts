/**
 * Normalized chat data model for parsed conversations
 * Schema version 1.0
 */

/**
 * Message part types (discriminated union)
 */
export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'code'; lang: string | null; code: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'imageRef'; alt: string | null; src: string | null }
  | { type: 'unknown'; rawText: string };

/**
 * DOM reference for debugging purposes
 */
export interface DomRef {
  selectorHint?: string;
}

/**
 * Individual chat message
 */
export interface ChatMessage {
  /** Stable hash-based ID */
  id: string;
  /** 0-based message index */
  index: number;
  /** Message role */
  role: 'user' | 'assistant' | 'system' | 'unknown';
  /** Optional author name */
  author?: string;
  /** Optional creation timestamp */
  createdAt?: string;
  /** Debug-only DOM reference */
  domRef?: DomRef;
  /** Message content parts */
  parts: MessagePart[];
}

/**
 * Source metadata for the conversation
 */
export interface Source {
  /** Original URL */
  url: string;
  /** Capture timestamp (ISO 8601) */
  capturedAt: string;
  /** Source platform */
  platform: 'chatgpt';
}

/**
 * Chat metadata
 */
export interface Chat {
  /** Chat ID from URL if available */
  chatId?: string;
  /** Conversation title */
  title?: string;
}

/**
 * Complete chat document (normalized JSON structure)
 */
export interface ChatDocument {
  /** Schema version for compatibility */
  schemaVersion: '1.0';
  /** Source information */
  source: Source;
  /** Chat metadata */
  chat: Chat;
  /** Ordered list of messages */
  messages: ChatMessage[];
}

/**
 * Parser options
 */
export interface ParserOptions {
  /** Include debug information in output */
  debug?: boolean;
  /** Custom base URL for relative links */
  baseUrl?: string;
}

/**
 * Parser result with optional warnings
 */
export interface ParserResult {
  /** Parsed chat document */
  document: ChatDocument;
  /** Non-fatal warnings encountered during parsing */
  warnings: string[];
}
