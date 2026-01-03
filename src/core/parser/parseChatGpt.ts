/**
 * ChatGPT conversation parser
 * Extracts structured conversation data from ChatGPT DOM
 */

import type {
  ChatDocument,
  ChatMessage,
  ParserOptions,
  ParserResult,
} from '../model/chat';
import {
  findElement,
  findElements,
  detectRole,
  generateSelectorHint,
  CONVERSATION_CONTAINER,
  MESSAGE_BLOCKS,
  TITLE_SELECTORS,
} from './selectors';
import { extractContentParts } from './normalize';
import { generateMessageId } from './stableIds';

/**
 * Extract chat ID from URL
 */
function extractChatId(url: string): string | undefined {
  const match = url.match(/\/c\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : undefined;
}

/**
 * Extract conversation title from document
 */
function extractTitle(doc: Document): string | undefined {
  const titleElement = findElement(doc, TITLE_SELECTORS);
  if (titleElement) {
    const title = titleElement.textContent?.trim();
    if (title && title.length > 0 && title.length < 200) {
      return title;
    }
  }

  // Fallback to document title
  const docTitle = doc.title;
  if (docTitle && !docTitle.includes('ChatGPT')) {
    return docTitle;
  }

  return undefined;
}

/**
 * Parse a single message element
 */
function parseMessage(
  element: Element,
  index: number,
  options: ParserOptions,
  warnings: string[]
): ChatMessage | null {
  try {
    // Detect role
    const role = detectRole(element);

    // Extract content parts
    const parts = extractContentParts(element);

    if (parts.length === 0) {
      warnings.push(`Message ${index}: No content extracted`);
      return null;
    }

    // Generate stable ID
    const id = generateMessageId(role, parts, index);

    // Build message object
    const message: ChatMessage = {
      id,
      index,
      role,
      parts,
    };

    // Add debug info if requested
    if (options.debug) {
      message.domRef = {
        selectorHint: generateSelectorHint(element),
      };
    }

    // Try to extract timestamp if available
    const timeElement = element.querySelector('time[datetime]');
    if (timeElement) {
      const datetime = timeElement.getAttribute('datetime');
      if (datetime) {
        message.createdAt = datetime;
      }
    }

    return message;
  } catch (error) {
    warnings.push(`Message ${index}: Parse error - ${error}`);
    return null;
  }
}

/**
 * Parse ChatGPT conversation from DOM
 * 
 * @param doc - Document or container element
 * @param options - Parser options
 * @returns Parsed conversation with warnings
 */
export function parseChatGpt(
  doc: Document | Element,
  options: ParserOptions = {}
): ParserResult {
  const warnings: string[] = [];
  const isDocument = doc instanceof Document;
  const document = isDocument ? doc : doc.ownerDocument;

  if (!document) {
    throw new Error('Cannot parse: no document available');
  }

  // Find conversation container
  const container = findElement(doc, CONVERSATION_CONTAINER);
  if (!container) {
    warnings.push('Could not find conversation container');
    throw new Error('Conversation container not found');
  }

  // Find all message blocks
  const messageElements = findElements(container, MESSAGE_BLOCKS);
  
  if (messageElements.length === 0) {
    warnings.push('No message blocks found');
  }

  // Parse each message
  const messages: ChatMessage[] = [];
  messageElements.forEach((element, index) => {
    const message = parseMessage(element, index, options, warnings);
    if (message) {
      messages.push(message);
    }
  });

  // Extract metadata
  const url = isDocument ? doc.location?.href || '' : document.location?.href || '';
  const chatId = extractChatId(url);
  const title = isDocument ? extractTitle(doc) : undefined;

  // Build chat document
  const chatDocument: ChatDocument = {
    schemaVersion: '1.0',
    source: {
      url,
      capturedAt: new Date().toISOString(),
      platform: 'chatgpt',
    },
    chat: {
      chatId,
      title,
    },
    messages,
  };

  return {
    document: chatDocument,
    warnings,
  };
}

/**
 * Check if the current page is a supported ChatGPT page
 */
export function isChatGptPage(url?: string): boolean {
  const checkUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return (
    checkUrl.includes('chat.openai.com') ||
    checkUrl.includes('chatgpt.com')
  );
}

/**
 * Wait for conversation to be ready
 * Useful for dynamic content loading
 */
export async function waitForConversationReady(
  doc: Document,
  timeout = 10000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const container = findElement(doc, CONVERSATION_CONTAINER);
    if (container) {
      const messages = findElements(container, MESSAGE_BLOCKS);
      if (messages.length > 0) {
        return true;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}
