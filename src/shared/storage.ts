import browser from 'webextension-polyfill';
import { ConversationTree } from './types';

/**
 * Storage keys
 */
export const StorageKeys = {
  CONVERSATIONS: 'conversations',
  SETTINGS: 'settings',
  LAST_PARSED: 'last_parsed',
} as const;

/**
 * Storage utility for managing extension data
 */
export class Storage {
  /**
   * Save a conversation to storage
   */
  static async saveConversation(conversation: ConversationTree): Promise<void> {
    const conversations = await this.getConversations();
    conversations[conversation.id] = conversation;
    await browser.storage.local.set({ [StorageKeys.CONVERSATIONS]: conversations });
  }

  /**
   * Get all conversations from storage
   */
  static async getConversations(): Promise<Record<string, ConversationTree>> {
    const result = await browser.storage.local.get(StorageKeys.CONVERSATIONS);
    return result[StorageKeys.CONVERSATIONS] || {};
  }

  /**
   * Get a specific conversation by ID
   */
  static async getConversation(id: string): Promise<ConversationTree | null> {
    const conversations = await this.getConversations();
    return conversations[id] || null;
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(id: string): Promise<void> {
    const conversations = await this.getConversations();
    delete conversations[id];
    await browser.storage.local.set({ [StorageKeys.CONVERSATIONS]: conversations });
  }

  /**
   * Clear all stored data
   */
  static async clearAll(): Promise<void> {
    await browser.storage.local.clear();
  }

  /**
   * Get settings
   */
  static async getSettings(): Promise<any> {
    const result = await browser.storage.local.get(StorageKeys.SETTINGS);
    return result[StorageKeys.SETTINGS] || {};
  }

  /**
   * Save settings
   */
  static async saveSettings(settings: any): Promise<void> {
    await browser.storage.local.set({ [StorageKeys.SETTINGS]: settings });
  }
}
