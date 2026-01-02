import browser from 'webextension-polyfill';
import { ConversationTree, MessageNode, MessageType } from '../shared/types';
import { Messaging } from '../shared/messaging';

/**
 * Content script for parsing ChatGPT conversations
 */
class ChatGPTParser {
  private conversationId: string = '';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    console.log('AI Chat Summarizer content script initialized');

    // Listen for messages from background or UI
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Parse on load
    this.detectAndParse();
  }

  private async handleMessage(message: any): Promise<any> {
    if (message.type === MessageType.PARSE_PAGE) {
      return this.parseConversation();
    }
    return null;
  }

  private detectAndParse(): void {
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.parseConversation());
    } else {
      // Already loaded
      setTimeout(() => this.parseConversation(), 1000);
    }
  }

  private parseConversation(): ConversationTree | null {
    try {
      const conversation = this.extractConversationFromDOM();
      if (conversation) {
        // Send to background for storage
        Messaging.sendToBackground({
          type: MessageType.PARSE_COMPLETE,
          payload: conversation,
        });
        return conversation;
      }
    } catch (error) {
      console.error('Error parsing conversation:', error);
    }
    return null;
  }

  private extractConversationFromDOM(): ConversationTree | null {
    // This is a basic parser that looks for common ChatGPT DOM structures
    // The actual implementation may need to be adjusted based on ChatGPT's current HTML structure

    const conversationContainer = document.querySelector('[class*="conversation"]') ||
                                   document.querySelector('main') ||
                                   document.querySelector('[role="main"]');

    if (!conversationContainer) {
      console.warn('Could not find conversation container');
      return null;
    }

    // Extract conversation ID from URL
    const urlMatch = window.location.href.match(/\/c\/([a-zA-Z0-9-]+)/);
    this.conversationId = urlMatch ? urlMatch[1] : `conv_${Date.now()}`;

    // Look for message elements - these selectors are approximate
    const messageElements = conversationContainer.querySelectorAll(
      '[data-message-id], [data-testid*="message"], .message, [class*="message"]'
    );

    if (messageElements.length === 0) {
      console.warn('No messages found in conversation');
      return null;
    }

    const messages: MessageNode[] = [];
    let messageIndex = 0;

    messageElements.forEach((element) => {
      const messageNode = this.parseMessageElement(element as HTMLElement, messageIndex++);
      if (messageNode) {
        messages.push(messageNode);
      }
    });

    // Get conversation title
    const titleElement = document.querySelector('h1, [class*="title"], title');
    const title = titleElement?.textContent?.trim() || 'Untitled Conversation';

    // Build conversation tree
    const rootMessage: MessageNode = {
      id: 'root',
      role: 'system',
      content: 'Conversation Root',
      children: messages,
    };

    const conversation: ConversationTree = {
      id: this.conversationId,
      title,
      timestamp: Date.now(),
      root: rootMessage,
      metadata: {
        url: window.location.href,
        platform: 'ChatGPT',
      },
    };

    console.log('Parsed conversation:', conversation);
    return conversation;
  }

  private parseMessageElement(element: HTMLElement, index: number): MessageNode | null {
    const textContent = element.textContent?.trim();
    if (!textContent) return null;

    // Determine role based on element attributes or class names
    let role: 'user' | 'assistant' | 'system' = 'assistant';
    
    const classNames = element.className.toLowerCase();
    const dataRole = element.getAttribute('data-role');
    
    if (dataRole === 'user' || classNames.includes('user')) {
      role = 'user';
    } else if (dataRole === 'assistant' || classNames.includes('assistant') || classNames.includes('bot')) {
      role = 'assistant';
    }

    // Extract message ID
    const messageId = element.getAttribute('data-message-id') || 
                     element.getAttribute('id') || 
                     `msg_${index}`;

    return {
      id: messageId,
      role,
      content: textContent,
      timestamp: Date.now(),
      children: [],
    };
  }
}

// Initialize the parser
new ChatGPTParser();
