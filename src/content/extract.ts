/**
 * Content script extraction logic
 * Handles DOM parsing and message communication
 */

import browser from 'webextension-polyfill';
import { parseChatGpt, isChatGptPage, waitForConversationReady } from '../core/parser/parseChatGpt';
import { ParserMessageType, type ChatExtractedMessage } from '../core/messaging/schema';
import type { ParserOptions } from '../core/model/chat';

/**
 * Extract conversation from current page
 */
export async function extractConversation(options: ParserOptions = {}): Promise<void> {
  try {
    // Check if we're on a supported page
    if (!isChatGptPage()) {
      console.warn('Not a ChatGPT page, skipping extraction');
      return;
    }

    // Wait for conversation to be ready
    const ready = await waitForConversationReady(document, 5000);
    if (!ready) {
      console.warn('Conversation not ready after timeout');
    }

    // Parse the conversation
    const result = parseChatGpt(document, options);

    // Log warnings if any
    if (result.warnings.length > 0) {
      console.warn('Parser warnings:', result.warnings);
    }

    // Log success
    console.log('Parsed conversation:', result.document);
    console.log(`Extracted ${result.document.messages.length} messages`);

    // Send to background
    const message: ChatExtractedMessage = {
      type: ParserMessageType.CHAT_EXTRACTED,
      payload: {
        document: result.document,
        warnings: result.warnings,
      },
    };

    await browser.runtime.sendMessage(message);
  } catch (error) {
    console.error('Error extracting conversation:', error);
    throw error;
  }
}

/**
 * Check if page is ready for extraction
 */
export function isPageReady(): boolean {
  return document.readyState === 'complete' || document.readyState === 'interactive';
}

/**
 * Wait for page to be ready
 */
export async function waitForPageReady(): Promise<void> {
  if (isPageReady()) {
    return;
  }

  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    } else {
      resolve();
    }
  });
}
