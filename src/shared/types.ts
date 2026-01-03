/**
 * Message types for communication between extension components
 */
export enum MessageType {
  PARSE_PAGE = 'PARSE_PAGE',
  PARSE_COMPLETE = 'PARSE_COMPLETE',
  SUMMARIZE = 'SUMMARIZE',
  EXPORT = 'EXPORT',
  OPEN_UI = 'OPEN_UI',
  GET_CONVERSATION = 'GET_CONVERSATION',
  SEARCH = 'SEARCH',
}

/**
 * Export format options
 */
export enum ExportFormat {
  JSON = 'JSON',
  MARKDOWN = 'MARKDOWN',
  TEXT = 'TEXT',
  SQLITE = 'SQLITE',
}

/**
 * Message node representing a single message in a conversation
 */
export interface MessageNode {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  children?: MessageNode[];
  metadata?: {
    model?: string;
    tokens?: number;
    [key: string]: any;
  };
}

/**
 * Conversation tree structure
 */
export interface ConversationTree {
  id: string;
  title?: string;
  timestamp: number;
  root: MessageNode;
  metadata?: {
    url?: string;
    platform?: string;
    [key: string]: any;
  };
}

/**
 * Message for inter-component communication
 */
export interface ExtensionMessage {
  type: MessageType;
  payload?: any;
}

/**
 * Search result
 */
export interface SearchResult {
  nodeId: string;
  content: string;
  path: number[];
}

/**
 * Summarization request
 */
export interface SummarizeRequest {
  nodeIds?: string[]; // If not provided, summarize entire conversation
  prompt?: string;
}

/**
 * Export request
 */
export interface ExportRequest {
  format: ExportFormat;
  nodeIds?: string[]; // If not provided, export entire conversation
  filename?: string;
}
