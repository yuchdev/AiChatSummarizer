/**
 * Unit tests for ChatGPT parser
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseChatGpt, isChatGptPage } from '../../src/core/parser/parseChatGpt.js';
import type { ChatDocument } from '../../src/core/model/chat.js';

describe('parseChatGpt', () => {
  let mockDocument: Document;

  beforeEach(() => {
    // Create a mock document
    mockDocument = document.implementation.createHTMLDocument('Test');
  });

  describe('basic parsing', () => {
    it('should parse a simple conversation', () => {
      mockDocument.body.innerHTML = `
        <main>
          <div data-message-id="1" data-role="user">
            <p>Hello, how are you?</p>
          </div>
          <div data-message-id="2" data-role="assistant">
            <p>I'm doing well, thank you!</p>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);

      expect(result.document).toBeDefined();
      expect(result.document.schemaVersion).toBe('1.0');
      expect(result.document.messages.length).toBe(2);
      expect(result.document.messages[0].role).toBe('user');
      expect(result.document.messages[1].role).toBe('assistant');
    });

    it('should extract message content correctly', () => {
      mockDocument.body.innerHTML = `
        <main>
          <div data-message-id="1" data-role="user">
            <p>What is 2 + 2?</p>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);

      expect(result.document.messages.length).toBe(1);
      const message = result.document.messages[0];
      expect(message.parts.length).toBeGreaterThan(0);
      expect(message.parts[0].type).toBe('text');
      if (message.parts[0].type === 'text') {
        expect(message.parts[0].text).toContain('2 + 2');
      }
    });
  });

  describe('code block extraction', () => {
    it('should extract code blocks with language', () => {
      mockDocument.body.innerHTML = `
        <main>
          <div data-message-id="1" data-role="assistant">
            <pre><code class="language-python">print("hello")</code></pre>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);
      const message = result.document.messages[0];

      const codePart = message.parts.find((p) => p.type === 'code');
      expect(codePart).toBeDefined();
      if (codePart && codePart.type === 'code') {
        expect(codePart.lang).toBe('python');
        expect(codePart.code).toContain('print("hello")');
      }
    });

    it('should handle code blocks without language', () => {
      mockDocument.body.innerHTML = `
        <main>
          <div data-message-id="1" data-role="assistant">
            <pre><code>console.log("test");</code></pre>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);
      const message = result.document.messages[0];

      const codePart = message.parts.find((p) => p.type === 'code');
      expect(codePart).toBeDefined();
      if (codePart && codePart.type === 'code') {
        expect(codePart.code).toContain('console.log');
      }
    });
  });

  describe('list extraction', () => {
    it('should extract ordered lists', () => {
      mockDocument.body.innerHTML = `
        <main>
          <div data-message-id="1" data-role="assistant">
            <ol>
              <li>First item</li>
              <li>Second item</li>
            </ol>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);
      const message = result.document.messages[0];

      const listPart = message.parts.find((p) => p.type === 'list');
      expect(listPart).toBeDefined();
      if (listPart && listPart.type === 'list') {
        expect(listPart.ordered).toBe(true);
        expect(listPart.items).toHaveLength(2);
        expect(listPart.items[0]).toContain('First item');
      }
    });

    it('should extract unordered lists', () => {
      mockDocument.body.innerHTML = `
        <main>
          <div data-message-id="1" data-role="assistant">
            <ul>
              <li>Bullet one</li>
              <li>Bullet two</li>
            </ul>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);
      const message = result.document.messages[0];

      const listPart = message.parts.find((p) => p.type === 'list');
      expect(listPart).toBeDefined();
      if (listPart && listPart.type === 'list') {
        expect(listPart.ordered).toBe(false);
        expect(listPart.items).toHaveLength(2);
      }
    });
  });

  describe('metadata extraction', () => {
    it('should extract chat ID from URL', () => {
      // Mock location for URL extraction
      Object.defineProperty(mockDocument, 'location', {
        value: {
          href: 'https://chat.openai.com/c/abc123def456',
        },
        writable: true,
      });

      mockDocument.body.innerHTML = `
        <main>
          <div data-message-id="1" data-role="user">
            <p>Test message</p>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);

      expect(result.document.chat.chatId).toBe('abc123def456');
      expect(result.document.source.platform).toBe('chatgpt');
    });

    it('should extract conversation title', () => {
      mockDocument.body.innerHTML = `
        <h1>My Conversation Title</h1>
        <main>
          <div data-message-id="1" data-role="user">
            <p>Test message</p>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);

      expect(result.document.chat.title).toBe('My Conversation Title');
    });
  });

  describe('stable IDs', () => {
    it('should generate stable message IDs', () => {
      mockDocument.body.innerHTML = `
        <main>
          <div data-message-id="1" data-role="user">
            <p>Test message</p>
          </div>
        </main>
      `;

      const result1 = parseChatGpt(mockDocument);
      const result2 = parseChatGpt(mockDocument);

      expect(result1.document.messages[0].id).toBe(result2.document.messages[0].id);
    });

    it('should maintain index in message objects', () => {
      mockDocument.body.innerHTML = `
        <main>
          <div data-message-id="1" data-role="user">
            <p>First</p>
          </div>
          <div data-message-id="2" data-role="assistant">
            <p>Second</p>
          </div>
          <div data-message-id="3" data-role="user">
            <p>Third</p>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);

      expect(result.document.messages[0].index).toBe(0);
      expect(result.document.messages[1].index).toBe(1);
      expect(result.document.messages[2].index).toBe(2);
    });
  });

  describe('DOM drift resilience', () => {
    it('should handle missing wrapper divs', () => {
      // Simulate a simplified DOM structure
      mockDocument.body.innerHTML = `
        <main>
          <div data-testid="conversation-turn-1">
            <p>Message without standard wrapper</p>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);

      expect(result.document.messages.length).toBeGreaterThan(0);
    });

    it('should work with minimal DOM structure', () => {
      mockDocument.body.innerHTML = `
        <main>
          <div class="message">
            <p>Minimal structure message</p>
          </div>
        </main>
      `;

      const result = parseChatGpt(mockDocument);

      expect(result.document.messages.length).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should return warnings for problematic content', () => {
      mockDocument.body.innerHTML = `<main></main>`;

      const result = parseChatGpt(mockDocument);

      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should throw error if conversation container not found', () => {
      mockDocument.body.innerHTML = `<div>No main element</div>`;

      expect(() => parseChatGpt(mockDocument)).toThrow();
    });
  });

  describe('isChatGptPage', () => {
    it('should return true for chat.openai.com', () => {
      expect(isChatGptPage('https://chat.openai.com/c/123')).toBe(true);
    });

    it('should return true for chatgpt.com', () => {
      expect(isChatGptPage('https://chatgpt.com/c/123')).toBe(true);
    });

    it('should return false for other domains', () => {
      expect(isChatGptPage('https://example.com')).toBe(false);
    });
  });
});
