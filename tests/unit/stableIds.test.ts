/**
 * Unit tests for stable ID generation
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeWhitespace,
  normalizePartsText,
  stripUIText,
  generateMessageId,
} from '../../src/core/parser/stableIds.js';
import type { MessagePart } from '../../src/core/model/chat.js';

describe('stableIds', () => {
  describe('normalizeWhitespace', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(normalizeWhitespace('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeWhitespace('hello    world')).toBe('hello world');
    });

    it('should normalize line endings', () => {
      expect(normalizeWhitespace('hello\r\nworld')).toBe('hello\nworld');
      expect(normalizeWhitespace('hello\rworld')).toBe('hello\nworld');
    });
  });

  describe('normalizePartsText', () => {
    it('should extract text from text parts', () => {
      const parts: MessagePart[] = [
        { type: 'text', text: '  Hello world  ' },
      ];
      expect(normalizePartsText(parts)).toBe('Hello world');
    });

    it('should include code language in normalized text', () => {
      const parts: MessagePart[] = [
        { type: 'code', lang: 'python', code: 'print("hello")' },
      ];
      expect(normalizePartsText(parts)).toContain('CODE:python');
      expect(normalizePartsText(parts)).toContain('print("hello")');
    });

    it('should handle list parts', () => {
      const parts: MessagePart[] = [
        { type: 'list', ordered: true, items: ['First', 'Second'] },
      ];
      expect(normalizePartsText(parts)).toContain('LIST:ol');
      expect(normalizePartsText(parts)).toContain('First');
      expect(normalizePartsText(parts)).toContain('Second');
    });

    it('should handle quote parts', () => {
      const parts: MessagePart[] = [
        { type: 'quote', text: 'Quoted text' },
      ];
      expect(normalizePartsText(parts)).toContain('QUOTE');
      expect(normalizePartsText(parts)).toContain('Quoted text');
    });

    it('should handle link parts', () => {
      const parts: MessagePart[] = [
        { type: 'link', text: 'Click here', href: 'https://example.com' },
      ];
      expect(normalizePartsText(parts)).toContain('LINK:https://example.com');
      expect(normalizePartsText(parts)).toContain('Click here');
    });
  });

  describe('stripUIText', () => {
    it('should remove "copy" text', () => {
      expect(stripUIText('Some text Copy code')).not.toContain('Copy');
    });

    it('should remove "regenerate" text', () => {
      expect(stripUIText('Response Regenerate')).not.toContain('Regenerate');
    });

    it('should remove message counters', () => {
      expect(stripUIText('Message 1 / 20 content')).not.toContain('1 / 20');
    });
  });

  describe('generateMessageId', () => {
    it('should generate consistent IDs for same content', () => {
      const parts: MessagePart[] = [{ type: 'text', text: 'Hello' }];
      const id1 = generateMessageId('user', parts, 0);
      const id2 = generateMessageId('user', parts, 0);
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different roles', () => {
      const parts: MessagePart[] = [{ type: 'text', text: 'Hello' }];
      const id1 = generateMessageId('user', parts, 0);
      const id2 = generateMessageId('assistant', parts, 0);
      expect(id1).not.toBe(id2);
    });

    it('should generate different IDs for different indices', () => {
      const parts: MessagePart[] = [{ type: 'text', text: 'Hello' }];
      const id1 = generateMessageId('user', parts, 0);
      const id2 = generateMessageId('user', parts, 1);
      expect(id1).not.toBe(id2);
    });

    it('should include index in ID format', () => {
      const parts: MessagePart[] = [{ type: 'text', text: 'Hello' }];
      const id = generateMessageId('user', parts, 5);
      expect(id).toMatch(/^msg_[a-z0-9]+_5$/);
    });

    it('should handle empty parts gracefully', () => {
      const parts: MessagePart[] = [];
      const id = generateMessageId('user', parts, 0);
      expect(id).toMatch(/^msg_[a-z0-9]+_0$/);
    });
  });
});
