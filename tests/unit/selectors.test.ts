/**
 * Unit tests for selector utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  findElement,
  findElements,
  detectRole,
  generateSelectorHint,
  CONVERSATION_CONTAINER,
  MESSAGE_BLOCKS,
} from '../../src/core/parser/selectors.js';

describe('selectors', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('findElement', () => {
    it('should find element using primary selector', () => {
      container.innerHTML = '<main>Content</main>';
      const element = findElement(container, CONVERSATION_CONTAINER);
      expect(element).toBeTruthy();
      expect(element?.tagName).toBe('MAIN');
    });

    it('should return null if no element found', () => {
      container.innerHTML = '<div>No match</div>';
      const config = {
        primary: ['nonexistent'],
        fallback: ['alsononexistent'],
      };
      const element = findElement(container, config);
      expect(element).toBeNull();
    });

    it('should use heuristic when provided', () => {
      container.innerHTML = `
        <main class="small">Small</main>
        <main class="large">Large content here</main>
      `;
      const config = {
        primary: ['main'],
        fallback: [],
        heuristic: (el: Element) => (el.textContent?.length || 0) > 10,
      };
      const element = findElement(container, config);
      expect(element?.textContent).toContain('Large');
    });
  });

  describe('findElements', () => {
    it('should find all matching elements', () => {
      container.innerHTML = `
        <div data-message-id="1">Message 1</div>
        <div data-message-id="2">Message 2</div>
      `;
      const elements = findElements(container, MESSAGE_BLOCKS);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should avoid duplicates', () => {
      container.innerHTML = `
        <div class="message" data-testid="message">Content</div>
      `;
      const elements = findElements(container, MESSAGE_BLOCKS);
      // Even though element matches multiple selectors, should only appear once
      expect(elements.length).toBe(1);
    });
  });

  describe('detectRole', () => {
    it('should detect user role from data-role attribute', () => {
      const element = document.createElement('div');
      element.setAttribute('data-role', 'user');
      expect(detectRole(element)).toBe('user');
    });

    it('should detect assistant role from class name', () => {
      const element = document.createElement('div');
      element.className = 'message-assistant';
      expect(detectRole(element)).toBe('assistant');
    });

    it('should detect system role', () => {
      const element = document.createElement('div');
      element.className = 'system-message';
      expect(detectRole(element)).toBe('system');
    });

    it('should return unknown for unidentifiable role', () => {
      const element = document.createElement('div');
      element.className = 'some-random-class';
      expect(detectRole(element)).toBe('unknown');
    });

    it('should prioritize data-role over class names', () => {
      const element = document.createElement('div');
      element.setAttribute('data-role', 'user');
      element.className = 'assistant';
      expect(detectRole(element)).toBe('user');
    });
  });

  describe('generateSelectorHint', () => {
    it('should include tag name', () => {
      const element = document.createElement('div');
      container.appendChild(element);
      const hint = generateSelectorHint(element);
      expect(hint).toContain('div');
    });

    it('should include ID if present', () => {
      const element = document.createElement('div');
      element.id = 'test-id';
      container.appendChild(element);
      const hint = generateSelectorHint(element);
      expect(hint).toContain('#test-id');
    });

    it('should include classes if present', () => {
      const element = document.createElement('div');
      element.className = 'class1 class2 class3';
      container.appendChild(element);
      const hint = generateSelectorHint(element);
      expect(hint).toContain('.class1');
    });

    it('should include nth-of-type', () => {
      container.innerHTML = `
        <div>First</div>
        <div>Second</div>
        <div>Third</div>
      `;
      const element = container.children[1] as HTMLElement;
      const hint = generateSelectorHint(element);
      expect(hint).toContain('nth-of-type(2)');
    });
  });
});
