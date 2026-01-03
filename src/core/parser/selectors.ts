/**
 * DOM selector utilities with fallback strategies for resilient parsing
 * ChatGPT's DOM structure changes over time, so we use multiple strategies
 */

/**
 * Selector configuration for finding conversation elements
 */
export interface SelectorConfig {
  /** Primary selectors to try first */
  primary: string[];
  /** Fallback selectors if primary fails */
  fallback: string[];
  /** Semantic heuristics (attribute patterns, etc.) */
  heuristic?: (element: Element) => boolean;
}

/**
 * Minimum container height threshold for heuristic validation
 */
const MIN_CONTAINER_HEIGHT = 200;

/**
 * Conversation container selectors
 * Prioritized from most specific to most general
 */
export const CONVERSATION_CONTAINER: SelectorConfig = {
  primary: [
    'main[class*="conversation"]',
    '[role="main"]',
    'main',
    '.conversation-container',
    '[data-testid="conversation"]',
  ],
  fallback: [
    'body > div > div > div > main',
    'body > div[id] > main',
    '#__next main',
  ],
  heuristic: (el) => {
    // Must be a substantial container
    // In tests, clientHeight may not be available, so check children instead
    const height = el.clientHeight || 0;
    return el.children.length > 0 && (height > MIN_CONTAINER_HEIGHT || height === 0);
  },
};

/**
 * Message block selectors
 * Look for repeating message elements
 */
export const MESSAGE_BLOCKS: SelectorConfig = {
  primary: [
    '[data-message-id]',
    '[data-testid*="conversation-turn"]',
    '[data-testid*="message"]',
    '[class*="message"]',
    '.group[data-testid]',
  ],
  fallback: [
    'main > div > div > div',
    'main [class*="group"]',
    'article',
  ],
  heuristic: (el) => {
    // Message blocks typically have substantial content
    const text = (el.textContent || '').trim();
    return text.length > 5 && el.querySelector('p, pre, code, ul, ol') !== null;
  },
};

/**
 * Message content area (within a message block)
 */
export const MESSAGE_CONTENT: SelectorConfig = {
  primary: [
    '[data-message-content]',
    '[class*="message-content"]',
    '.markdown',
    '[class*="prose"]',
  ],
  fallback: [
    'div[class*="whitespace"]',
    'div[class*="text"]',
    '> div > div',
  ],
};

/**
 * Role detection selectors
 */
export const ROLE_INDICATORS = {
  user: [
    '[data-role="user"]',
    '[class*="user"]',
    '[data-testid*="user"]',
  ],
  assistant: [
    '[data-role="assistant"]',
    '[class*="assistant"]',
    '[class*="bot"]',
    '[data-testid*="assistant"]',
  ],
  system: [
    '[data-role="system"]',
    '[class*="system"]',
  ],
};

/**
 * Title selectors
 */
export const TITLE_SELECTORS: SelectorConfig = {
  primary: [
    'h1',
    '[class*="conversation-title"]',
    '[data-testid*="title"]',
    'header h1',
    'header h2',
  ],
  fallback: [
    'main h1',
    'nav h1',
    'title',
  ],
};

/**
 * Code block selectors
 */
export const CODE_BLOCKS = {
  blocks: [
    'pre code',
    'pre',
    'code[class*="language-"]',
    'div[class*="code-block"]',
  ],
  language: [
    '[class*="language-"]',
    '[data-language]',
    'div[class*="lang-"]',
  ],
};

/**
 * Try to find element using selector config with fallbacks
 * Returns first matching element or null
 */
export function findElement(
  root: Element | Document,
  config: SelectorConfig
): Element | null {
  // Try primary selectors
  for (const selector of config.primary) {
    try {
      const element = root.querySelector(selector);
      if (element && (!config.heuristic || config.heuristic(element))) {
        return element;
      }
    } catch (e) {
      // Invalid selector, continue
      continue;
    }
  }

  // Try fallback selectors
  for (const selector of config.fallback) {
    try {
      const element = root.querySelector(selector);
      if (element && (!config.heuristic || config.heuristic(element))) {
        return element;
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

/**
 * Find all elements matching selector config
 */
export function findElements(
  root: Element | Document,
  config: SelectorConfig
): Element[] {
  const elements: Element[] = [];
  const seen = new Set<Element>();

  // Try primary selectors
  for (const selector of config.primary) {
    try {
      const matches = root.querySelectorAll(selector);
      matches.forEach((el) => {
        if (!seen.has(el) && (!config.heuristic || config.heuristic(el))) {
          seen.add(el);
          elements.push(el);
        }
      });
    } catch (e) {
      continue;
    }
  }

  // If no matches, try fallback
  if (elements.length === 0) {
    for (const selector of config.fallback) {
      try {
        const matches = root.querySelectorAll(selector);
        matches.forEach((el) => {
          if (!seen.has(el) && (!config.heuristic || config.heuristic(el))) {
            seen.add(el);
            elements.push(el);
          }
        });
      } catch (e) {
        continue;
      }
    }
  }

  return elements;
}

/**
 * Detect message role from element
 */
export function detectRole(element: Element): 'user' | 'assistant' | 'system' | 'unknown' {
  const checkSelectors = (selectors: string[]): boolean => {
    return selectors.some((selector) => {
      try {
        return element.matches(selector) || element.querySelector(selector) !== null;
      } catch {
        return false;
      }
    });
  };

  // Check explicit role indicators
  if (checkSelectors(ROLE_INDICATORS.user)) return 'user';
  if (checkSelectors(ROLE_INDICATORS.assistant)) return 'assistant';
  if (checkSelectors(ROLE_INDICATORS.system)) return 'system';

  // Heuristic: check class names and attributes
  const classNames = element.className.toLowerCase();
  const dataRole = element.getAttribute('data-role')?.toLowerCase();

  if (dataRole === 'user' || classNames.includes('user')) return 'user';
  if (dataRole === 'assistant' || classNames.includes('assistant') || classNames.includes('bot')) {
    return 'assistant';
  }
  if (dataRole === 'system' || classNames.includes('system')) return 'system';

  // Default to unknown if can't determine
  return 'unknown';
}

/**
 * Generate a simple selector hint for an element (for debugging)
 */
export function generateSelectorHint(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className
    ? `.${element.className.split(' ').slice(0, 2).join('.')}`
    : '';

  // Get position among siblings of same type
  let nth = 1;
  let sibling = element.previousElementSibling;
  while (sibling) {
    if (sibling.tagName === element.tagName) nth++;
    sibling = sibling.previousElementSibling;
  }

  return `${tag}${id}${classes}:nth-of-type(${nth})`;
}
