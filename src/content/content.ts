import browser from 'webextension-polyfill';
import { MessageType } from '../shared/types';
import { Messaging } from '../shared/messaging';
import { ParserMessageType, isParserMessage } from '../core/messaging/schema';
import { extractConversation, waitForPageReady } from './extract';
import { toggleOverlay, showOverlay, hideOverlay } from './debugOverlay';
import { isChatGptPage } from '../core/parser/parseChatGpt';

/**
 * Content script for parsing ChatGPT conversations
 * Now uses the new parser infrastructure
 */
class ChatGPTContentScript {
  private debugEnabled = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('AI Chat Summarizer content script initialized');

    // Check if we're on a supported page
    if (!isChatGptPage()) {
      console.log('Not a ChatGPT page, content script inactive');
      return;
    }

    // Load debug state from storage
    await this.loadDebugState();

    // Listen for messages from background or UI
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Wait for page to be ready, then parse
    await waitForPageReady();
    
    // Auto-parse after a delay to let page fully render
    setTimeout(() => {
      this.performExtraction();
    }, 1500);

    // Show debug overlay if enabled
    if (this.debugEnabled) {
      showOverlay();
    }

    // Add keyboard shortcut for debug overlay (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleOverlay();
      }
    });
  }

  private async loadDebugState(): Promise<void> {
    try {
      const result = await browser.storage.local.get('debug.parseOverlay');
      this.debugEnabled = result['debug.parseOverlay'] === true;
    } catch (error) {
      console.error('Failed to load debug state:', error);
    }
  }

  private async handleMessage(message: any): Promise<any> {
    // Handle legacy message types for backward compatibility
    if (message.type === MessageType.PARSE_PAGE) {
      await this.performExtraction();
      return { success: true };
    }

    // Handle new parser message types
    if (isParserMessage(message)) {
      switch (message.type) {
        case ParserMessageType.CHAT_EXTRACT_REQUEST:
          await this.performExtraction(message.payload?.debug);
          return { success: true };

        case ParserMessageType.DEBUG_TOGGLE:
          this.debugEnabled = message.payload.enabled;
          await browser.storage.local.set({ 'debug.parseOverlay': this.debugEnabled });
          if (this.debugEnabled) {
            showOverlay();
          } else {
            hideOverlay();
          }
          return { success: true };

        case ParserMessageType.DEBUG_GET_STATE:
          return { enabled: this.debugEnabled };
      }
    }

    return null;
  }

  private async performExtraction(debug?: boolean): Promise<void> {
    try {
      const options = {
        debug: debug ?? this.debugEnabled,
      };
      await extractConversation(options);
    } catch (error) {
      console.error('Extraction failed:', error);
    }
  }
}

// Initialize the content script
new ChatGPTContentScript();
