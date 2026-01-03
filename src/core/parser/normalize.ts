/**
 * Content normalization utilities for extracting structured content from DOM
 */

import type { MessagePart } from '../model/chat';
import { normalizeWhitespace } from './stableIds';

/**
 * Extract text content from an element, excluding UI noise
 */
export function extractTextContent(element: Element): string {
  // Clone to avoid modifying original DOM
  const clone = element.cloneNode(true) as Element;

  // Remove UI elements that shouldn't be in content
  const uiSelectors = [
    'button',
    '[role="button"]',
    '.copy-button',
    '[class*="toolbar"]',
    '[class*="action"]',
    '[aria-label*="Copy"]',
    '[aria-label*="Regenerate"]',
    '[aria-label*="Edit"]',
  ];

  uiSelectors.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  });

  return normalizeWhitespace(clone.textContent || '');
}

/**
 * Extract code blocks from an element
 */
export function extractCodeBlocks(element: Element): MessagePart[] {
  const parts: MessagePart[] = [];
  const codeBlocks = element.querySelectorAll('pre code, pre, code[class*="language-"]');

  codeBlocks.forEach((block) => {
    const code = (block.textContent || '').trim();
    if (!code) return;

    // Try to detect language from class names or nearby labels
    let lang: string | null = null;

    // Check for language class (e.g., language-python, lang-javascript)
    const classMatch = block.className.match(/(?:language|lang)-(\w+)/i);
    if (classMatch) {
      lang = classMatch[1].toLowerCase();
    }

    // Check for language label in nearby elements
    if (!lang) {
      const parent = block.parentElement;
      if (parent) {
        const label = parent.querySelector('[class*="language"], [data-language]');
        if (label) {
          lang =
            label.getAttribute('data-language') ||
            (label.textContent || '').toLowerCase().trim();
        }
      }
    }

    parts.push({ type: 'code', lang, code });
  });

  return parts;
}

/**
 * Extract lists from an element
 */
export function extractLists(element: Element): MessagePart[] {
  const parts: MessagePart[] = [];
  const lists = element.querySelectorAll('ol, ul');

  lists.forEach((list) => {
    const items: string[] = [];
    const listItems = list.querySelectorAll(':scope > li');

    listItems.forEach((li) => {
      const text = extractTextContent(li);
      if (text) items.push(text);
    });

    if (items.length > 0) {
      parts.push({
        type: 'list',
        ordered: list.tagName.toLowerCase() === 'ol',
        items,
      });
    }
  });

  return parts;
}

/**
 * Extract quotes from an element
 */
export function extractQuotes(element: Element): MessagePart[] {
  const parts: MessagePart[] = [];
  const quotes = element.querySelectorAll('blockquote, [class*="quote"]');

  quotes.forEach((quote) => {
    const text = extractTextContent(quote);
    if (text) {
      parts.push({ type: 'quote', text });
    }
  });

  return parts;
}

/**
 * Extract links from an element
 */
export function extractLinks(element: Element): MessagePart[] {
  const parts: MessagePart[] = [];
  const links = element.querySelectorAll('a[href]');

  links.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const text = extractTextContent(link);
    if (href && text) {
      parts.push({ type: 'link', text, href });
    }
  });

  return parts;
}

/**
 * Extract headings from an element
 */
export function extractHeadings(element: Element): MessagePart[] {
  const parts: MessagePart[] = [];
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
    const text = extractTextContent(heading);
    if (text) {
      parts.push({ type: 'heading', level, text });
    }
  });

  return parts;
}

/**
 * Extract image references from an element
 */
export function extractImages(element: Element): MessagePart[] {
  const parts: MessagePart[] = [];
  const images = element.querySelectorAll('img');

  images.forEach((img) => {
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt');
    parts.push({ type: 'imageRef', alt, src });
  });

  return parts;
}

/**
 * Extract all structured content from an element
 * Returns content parts in document order
 */
export function extractContentParts(element: Element): MessagePart[] {
  const parts: MessagePart[] = [];

  // Extract structured content first
  const codeBlocks = extractCodeBlocks(element);
  const lists = extractLists(element);
  const quotes = extractQuotes(element);
  const headings = extractHeadings(element);
  const images = extractImages(element);

  // Clone element and remove already-extracted structured content
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll('pre, code[class*="language-"], ol, ul, blockquote, h1, h2, h3, h4, h5, h6, img').forEach((el) => {
    // Replace with placeholder to maintain text flow
    const placeholder = document.createTextNode(` [${el.tagName}] `);
    el.parentNode?.replaceChild(placeholder, el);
  });

  // Extract remaining text content
  const remainingText = extractTextContent(clone);

  // If we have structured content, add it
  if (codeBlocks.length > 0 || lists.length > 0 || quotes.length > 0 || headings.length > 0) {
    // Add in a reasonable order
    parts.push(...headings);
    parts.push(...quotes);
    parts.push(...lists);
    parts.push(...codeBlocks);
    parts.push(...images);

    // Add remaining text if significant
    if (remainingText.length > 10) {
      parts.push({ type: 'text', text: remainingText });
    }
  } else if (remainingText) {
    // Just text content
    parts.push({ type: 'text', text: remainingText });
  }

  // If no content extracted at all, return unknown type
  if (parts.length === 0) {
    const rawText = extractTextContent(element);
    if (rawText) {
      parts.push({ type: 'unknown', rawText });
    }
  }

  return parts;
}

/**
 * Split text content into paragraphs
 */
export function splitIntoParagraphs(text: string): MessagePart[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((text) => ({ type: 'text', text }));
}
