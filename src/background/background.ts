import browser from 'webextension-polyfill';
import { ExtensionMessage, MessageType } from '../shared/types';
import { Storage } from '../shared/storage';
import { Messaging } from '../shared/messaging';

/**
 * Background service worker for the extension
 */
class BackgroundService {
  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Listen for messages from content scripts and UI
    browser.runtime.onMessage.addListener((message: any, sender: any) => 
      this.handleMessage(message as ExtensionMessage, sender)
    );

    // Listen for extension icon clicks
    browser.action.onClicked.addListener(this.handleIconClick.bind(this));

    console.log('AI Chat Summarizer background service initialized');
  }

  private async handleMessage(
    message: ExtensionMessage,
    sender: browser.Runtime.MessageSender
  ): Promise<any> {
    console.log('Background received message:', message.type, message);

    try {
      switch (message.type) {
        case MessageType.PARSE_COMPLETE:
          return this.handleParseComplete(message.payload);

        case MessageType.OPEN_UI:
          return this.handleOpenUI();

        case MessageType.GET_CONVERSATION:
          return this.handleGetConversation(message.payload);

        case MessageType.SUMMARIZE:
          return this.handleSummarize(message.payload);

        case MessageType.EXPORT:
          return this.handleExport(message.payload);

        default:
          console.warn('Unknown message type:', message.type);
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return { success: false, error: String(error) };
    }
  }

  private async handleParseComplete(conversation: any): Promise<any> {
    console.log('Saving parsed conversation:', conversation);
    await Storage.saveConversation(conversation);
    return { success: true };
  }

  private async handleOpenUI(): Promise<any> {
    await Messaging.openUITab();
    return { success: true };
  }

  private async handleGetConversation(payload: { id: string }): Promise<any> {
    const conversation = await Storage.getConversation(payload.id);
    return { success: true, conversation };
  }

  private async handleSummarize(payload: any): Promise<any> {
    // TODO: Implement summarization logic
    console.log('Summarize request:', payload);
    return { success: true, summary: 'Summarization not yet implemented' };
  }

  private async handleExport(payload: any): Promise<any> {
    // TODO: Implement export logic
    console.log('Export request:', payload);
    return { success: true, message: 'Export not yet implemented' };
  }

  private async handleIconClick(tab: browser.Tabs.Tab): Promise<void> {
    // Open UI tab when icon is clicked
    await Messaging.openUITab();
  }
}

// Initialize the background service
new BackgroundService();
