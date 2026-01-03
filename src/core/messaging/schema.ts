/**
 * Messaging schema for extension communication
 * Extends existing messaging with new parser-specific messages
 */

import type { ChatDocument } from '../model/chat';

/**
 * Message types for parser-related communication
 */
export enum ParserMessageType {
  /** Request to extract chat from current page */
  CHAT_EXTRACT_REQUEST = 'CHAT_EXTRACT_REQUEST',
  /** Chat extraction complete */
  CHAT_EXTRACTED = 'CHAT_EXTRACTED',
  /** Toggle debug overlay */
  DEBUG_TOGGLE = 'DEBUG_TOGGLE',
  /** Get debug state */
  DEBUG_GET_STATE = 'DEBUG_GET_STATE',
}

/**
 * Chat extraction request message
 */
export interface ChatExtractRequestMessage {
  type: ParserMessageType.CHAT_EXTRACT_REQUEST;
  payload?: {
    /** Include debug information */
    debug?: boolean;
  };
}

/**
 * Chat extracted message
 */
export interface ChatExtractedMessage {
  type: ParserMessageType.CHAT_EXTRACTED;
  payload: {
    /** Parsed chat document */
    document: ChatDocument;
    /** Parsing warnings */
    warnings: string[];
  };
}

/**
 * Debug toggle message
 */
export interface DebugToggleMessage {
  type: ParserMessageType.DEBUG_TOGGLE;
  payload: {
    /** Enable/disable debug overlay */
    enabled: boolean;
  };
}

/**
 * Debug state response
 */
export interface DebugGetStateMessage {
  type: ParserMessageType.DEBUG_GET_STATE;
  payload?: {
    /** Current debug state */
    enabled: boolean;
  };
}

/**
 * Union of all parser messages
 */
export type ParserMessage =
  | ChatExtractRequestMessage
  | ChatExtractedMessage
  | DebugToggleMessage
  | DebugGetStateMessage;

/**
 * Type guard for parser messages
 */
export function isParserMessage(message: any): message is ParserMessage {
  return (
    message &&
    typeof message === 'object' &&
    'type' in message &&
    Object.values(ParserMessageType).includes(message.type)
  );
}
