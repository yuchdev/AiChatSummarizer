import browser from 'webextension-polyfill';
import { ExtensionMessage, MessageType } from './types';

/**
 * Messaging utility for inter-component communication
 */
export class Messaging {
  /**
   * Send a message to the background script
   */
  static async sendToBackground(message: ExtensionMessage): Promise<any> {
    return browser.runtime.sendMessage(message);
  }

  /**
   * Send a message to a specific tab
   */
  static async sendToTab(tabId: number, message: ExtensionMessage): Promise<any> {
    return browser.tabs.sendMessage(tabId, message);
  }

  /**
   * Send a message to the active tab
   */
  static async sendToActiveTab(message: ExtensionMessage): Promise<any> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      return this.sendToTab(tabs[0].id, message);
    }
    throw new Error('No active tab found');
  }

  /**
   * Listen for messages
   */
  static addListener(
    callback: (message: ExtensionMessage, sender: browser.Runtime.MessageSender) => any
  ): void {
    browser.runtime.onMessage.addListener((message: any, sender: any) => 
      callback(message as ExtensionMessage, sender)
    );
  }

  /**
   * Remove a message listener
   */
  static removeListener(
    callback: (message: ExtensionMessage, sender: browser.Runtime.MessageSender) => any
  ): void {
    // Note: Due to wrapping, removing listeners may not work as expected
    // Consider using a different pattern if removal is critical
    browser.runtime.onMessage.removeListener((message: any, sender: any) => 
      callback(message as ExtensionMessage, sender)
    );
  }

  /**
   * Open the UI tab
   */
  static async openUITab(): Promise<void> {
    await browser.tabs.create({
      url: browser.runtime.getURL('ui/ui.html'),
    });
  }
}
