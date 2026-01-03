/**
 * Stable ID generation for messages
 * Uses deterministic hashing to create consistent IDs
 */

import type { MessagePart } from '../model/chat';

/**
 * Simple string hash function (djb2 algorithm)
 * Returns a deterministic hash for the same input
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Normalize whitespace in text
 * - Trim leading/trailing whitespace
 * - Collapse multiple spaces into one
 * - Normalize newlines to \n
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ') // Collapse spaces/tabs
    .trim();
}

/**
 * Extract normalized text from message parts
 * This is used for ID generation to ensure consistency
 */
export function normalizePartsText(parts: MessagePart[]): string {
  const textParts: string[] = [];

  for (const part of parts) {
    switch (part.type) {
      case 'text':
        textParts.push(normalizeWhitespace(part.text));
        break;
      case 'code':
        // Include language and code for uniqueness
        textParts.push(`[CODE:${part.lang || 'plain'}]${normalizeWhitespace(part.code)}`);
        break;
      case 'list':
        // Include list type and items
        textParts.push(
          `[LIST:${part.ordered ? 'ol' : 'ul'}]${part.items.map(normalizeWhitespace).join('|')}`
        );
        break;
      case 'quote':
        textParts.push(`[QUOTE]${normalizeWhitespace(part.text)}`);
        break;
      case 'link':
        textParts.push(`[LINK:${part.href}]${normalizeWhitespace(part.text)}`);
        break;
      case 'heading':
        textParts.push(`[H${part.level}]${normalizeWhitespace(part.text)}`);
        break;
      case 'imageRef':
        textParts.push(`[IMG:${part.src}]${part.alt || ''}`);
        break;
      case 'unknown':
        textParts.push(normalizeWhitespace(part.rawText));
        break;
    }
  }

  return textParts.join('\n');
}

/**
 * Strip UI noise text that shouldn't affect message identity
 * Common ChatGPT UI elements to remove
 */
const UI_NOISE_PATTERNS = [
  /\bcopy\b/gi,
  /\bcopied\b/gi,
  /\bregenerate\b/gi,
  /\bedit\b/gi,
  /\bthumb(s)?\s*(up|down)\b/gi,
  /\bshare\b/gi,
  /\bcontinue\b/gi,
  /^\s*[\d]+\s*\/\s*[\d]+\s*$/gi, // Message counters like "1 / 20"
];

/**
 * Remove UI noise from text
 */
export function stripUIText(text: string): string {
  let cleaned = text;
  for (const pattern of UI_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned;
}

/**
 * Generate a stable message ID based on content and position
 * 
 * The ID is deterministic: same content + role + index = same ID
 * 
 * @param role - Message role
 * @param parts - Message content parts
 * @param index - Message index (used as salt for uniqueness)
 * @returns Stable message ID
 */
export function generateMessageId(
  role: string,
  parts: MessagePart[],
  index: number
): string {
  // Normalize content
  const normalizedText = normalizePartsText(parts);
  const cleanedText = stripUIText(normalizedText);

  // Create hash input: role + cleaned text + index salt
  const hashInput = `${role}:${cleanedText}:${index}`;
  const hash = hashString(hashInput);

  // Format: msg_<hash>_<index>
  return `msg_${hash}_${index}`;
}
