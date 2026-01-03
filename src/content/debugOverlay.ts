/**
 * Debug overlay for visual parsing verification
 * Injects a UI overlay to inspect parsed conversation data
 */

import { parseChatGpt } from '../core/parser/parseChatGpt';
import type { ChatDocument } from '../core/model/chat';
import { findElements, MESSAGE_BLOCKS, CONVERSATION_CONTAINER, findElement } from '../core/parser/selectors';

const OVERLAY_ID = 'chat-parser-debug-overlay';
const HIGHLIGHT_CLASS = 'chat-parser-highlight';

/**
 * Debug overlay state
 */
interface OverlayState {
  isVisible: boolean;
  isHighlighting: boolean;
  lastParsed?: ChatDocument;
}

const state: OverlayState = {
  isVisible: false,
  isHighlighting: false,
};

/**
 * Inject overlay styles
 */
function injectStyles(): void {
  if (document.getElementById('chat-parser-debug-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'chat-parser-debug-styles';
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      max-height: 80vh;
      background: rgba(17, 24, 39, 0.98);
      color: white;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      z-index: 999999;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    #${OVERLAY_ID}.minimized {
      width: 200px;
      height: auto;
    }

    .debug-overlay-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 12px 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
    }

    .debug-overlay-title {
      font-size: 14px;
    }

    .debug-overlay-controls {
      display: flex;
      gap: 8px;
    }

    .debug-overlay-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    .debug-overlay-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .debug-overlay-content {
      padding: 16px;
      max-height: calc(80vh - 120px);
      overflow-y: auto;
    }

    #${OVERLAY_ID}.minimized .debug-overlay-content {
      display: none;
    }

    .debug-overlay-section {
      margin-bottom: 16px;
    }

    .debug-overlay-label {
      color: #9ca3af;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      font-weight: 600;
    }

    .debug-overlay-value {
      color: white;
      font-size: 13px;
      margin-bottom: 8px;
      word-break: break-word;
    }

    .debug-overlay-value.url {
      font-size: 11px;
      opacity: 0.8;
    }

    .debug-overlay-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .debug-overlay-stat {
      background: rgba(255, 255, 255, 0.05);
      padding: 12px;
      border-radius: 6px;
    }

    .debug-overlay-stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
    }

    .debug-overlay-stat-label {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .debug-overlay-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .debug-overlay-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
      text-align: center;
    }

    .debug-overlay-button:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .debug-overlay-button.active {
      background: #667eea;
      border-color: #667eea;
    }

    .${HIGHLIGHT_CLASS} {
      outline: 3px solid #667eea !important;
      outline-offset: 2px !important;
      background: rgba(102, 126, 234, 0.1) !important;
      position: relative !important;
    }

    .${HIGHLIGHT_CLASS}::before {
      content: attr(data-debug-index) " · " attr(data-debug-role);
      position: absolute;
      top: -24px;
      left: 0;
      background: #667eea;
      color: white;
      padding: 4px 8px;
      font-size: 11px;
      border-radius: 4px;
      font-weight: 600;
      z-index: 999999;
      pointer-events: none;
    }

    .debug-overlay-warnings {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      padding: 8px;
      font-size: 11px;
      color: #fca5a5;
      max-height: 100px;
      overflow-y: auto;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Create overlay HTML
 */
function createOverlayHTML(document: ChatDocument | null): string {
  if (!document) {
    return `
      <div class="debug-overlay-header">
        <span class="debug-overlay-title">Chat Parser Debug</span>
        <div class="debug-overlay-controls">
          <button class="debug-overlay-btn" data-action="minimize">_</button>
          <button class="debug-overlay-btn" data-action="close">×</button>
        </div>
      </div>
      <div class="debug-overlay-content">
        <div class="debug-overlay-section">
          <div class="debug-overlay-value">No conversation parsed yet</div>
          <button class="debug-overlay-button" data-action="parse">Parse Now</button>
        </div>
      </div>
    `;
  }

  const roleCounts = document.messages.reduce((acc, msg) => {
    acc[msg.role] = (acc[msg.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const warnings = state.lastParsed && 'warnings' in state ? (state as any).warnings : [];

  return `
    <div class="debug-overlay-header">
      <span class="debug-overlay-title">Chat Parser Debug</span>
      <div class="debug-overlay-controls">
        <button class="debug-overlay-btn" data-action="minimize">_</button>
        <button class="debug-overlay-btn" data-action="close">×</button>
      </div>
    </div>
    <div class="debug-overlay-content">
      <div class="debug-overlay-section">
        <div class="debug-overlay-label">Title</div>
        <div class="debug-overlay-value">${document.chat.title || 'Untitled'}</div>
      </div>

      <div class="debug-overlay-section">
        <div class="debug-overlay-label">URL</div>
        <div class="debug-overlay-value url">${document.source.url}</div>
      </div>

      <div class="debug-overlay-stats">
        <div class="debug-overlay-stat">
          <div class="debug-overlay-stat-value">${document.messages.length}</div>
          <div class="debug-overlay-stat-label">Total Messages</div>
        </div>
        <div class="debug-overlay-stat">
          <div class="debug-overlay-stat-value">${Object.keys(roleCounts).length}</div>
          <div class="debug-overlay-stat-label">Role Types</div>
        </div>
      </div>

      <div class="debug-overlay-section">
        <div class="debug-overlay-label">Role Distribution</div>
        ${Object.entries(roleCounts)
          .map(([role, count]) => `<div class="debug-overlay-value">${role}: ${count}</div>`)
          .join('')}
      </div>

      ${warnings.length > 0 ? `
        <div class="debug-overlay-section">
          <div class="debug-overlay-label">Warnings</div>
          <div class="debug-overlay-warnings">
            ${warnings.map((w: string) => `<div>⚠ ${w}</div>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="debug-overlay-section">
        <div class="debug-overlay-label">Last Parse</div>
        <div class="debug-overlay-value">${new Date(document.source.capturedAt).toLocaleTimeString()}</div>
      </div>

      <div class="debug-overlay-buttons">
        <button class="debug-overlay-button" data-action="parse">🔄 Re-parse</button>
        <button class="debug-overlay-button" data-action="copy">📋 Copy JSON</button>
        <button class="debug-overlay-button" data-action="download">💾 Download JSON</button>
        <button class="debug-overlay-button ${state.isHighlighting ? 'active' : ''}" data-action="highlight">
          ${state.isHighlighting ? '✓ ' : ''}Highlight Messages
        </button>
      </div>
    </div>
  `;
}

/**
 * Highlight message elements in the DOM
 */
function highlightMessages(document: ChatDocument): void {
  clearHighlights();

  const container = findElement(window.document, CONVERSATION_CONTAINER);
  if (!container) return;

  const messageElements = findElements(container, MESSAGE_BLOCKS);

  messageElements.forEach((element, index) => {
    if (index < document.messages.length) {
      const message = document.messages[index];
      element.classList.add(HIGHLIGHT_CLASS);
      element.setAttribute('data-debug-index', `#${index}`);
      element.setAttribute('data-debug-role', message.role);
    }
  });

  state.isHighlighting = true;
}

/**
 * Clear all highlights
 */
function clearHighlights(): void {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(HIGHLIGHT_CLASS);
    el.removeAttribute('data-debug-index');
    el.removeAttribute('data-debug-role');
  });
  state.isHighlighting = false;
}

/**
 * Copy JSON to clipboard
 */
async function copyJSON(document: ChatDocument): Promise<void> {
  const json = JSON.stringify(document, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    // TODO: Replace alert with toast notification in future
    console.log('[Debug Overlay] JSON copied to clipboard');
  } catch (error) {
    console.error('Failed to copy:', error);
    // Fallback: create temporary textarea
    const textarea = window.document.createElement('textarea');
    textarea.value = json;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    window.document.body.appendChild(textarea);
    textarea.select();
    window.document.execCommand('copy');
    window.document.body.removeChild(textarea);
    console.log('[Debug Overlay] JSON copied to clipboard (fallback)');
  }
}

/**
 * Download JSON as file
 */
function downloadJSON(document: ChatDocument): void {
  const json = JSON.stringify(document, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = `chat-${document.chat.chatId || 'export'}-${Date.now()}.json`;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Handle overlay button clicks
 */
function handleAction(action: string, overlay: HTMLElement): void {
  switch (action) {
    case 'close':
      hideOverlay();
      break;
    case 'minimize':
      overlay.classList.toggle('minimized');
      break;
    case 'parse':
      parseAndUpdate();
      break;
    case 'copy':
      if (state.lastParsed) {
        copyJSON(state.lastParsed);
      }
      break;
    case 'download':
      if (state.lastParsed) {
        downloadJSON(state.lastParsed);
      }
      break;
    case 'highlight':
      if (state.lastParsed) {
        if (state.isHighlighting) {
          clearHighlights();
          parseAndUpdate(); // Refresh to update button state
        } else {
          highlightMessages(state.lastParsed);
          parseAndUpdate(); // Refresh to update button state
        }
      }
      break;
  }
}

/**
 * Parse conversation and update overlay
 */
function parseAndUpdate(): void {
  try {
    const result = parseChatGpt(window.document, { debug: true });
    state.lastParsed = result.document;
    (state as any).warnings = result.warnings;
    updateOverlay();
  } catch (error) {
    console.error('Parse error:', error);
    // TODO: Replace alert with toast notification in future
    console.error('[Debug Overlay] Parse failed:', error);
  }
}

/**
 * Update overlay content
 */
function updateOverlay(): void {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    const isMinimized = overlay.classList.contains('minimized');
    overlay.innerHTML = createOverlayHTML(state.lastParsed || null);
    if (isMinimized) {
      overlay.classList.add('minimized');
    }
    attachEventListeners(overlay);
  }
}

/**
 * Attach event listeners to overlay
 */
function attachEventListeners(overlay: HTMLElement): void {
  // Handle button clicks
  overlay.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute('data-action');
    if (action) {
      e.preventDefault();
      e.stopPropagation();
      handleAction(action, overlay);
    }
  });

  // Make draggable
  const header = overlay.querySelector('.debug-overlay-header') as HTMLElement;
  if (header) {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;

    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).classList.contains('debug-overlay-btn')) {
        return;
      }
      isDragging = true;
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        overlay.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
}

/**
 * Show debug overlay
 */
export function showOverlay(): void {
  if (state.isVisible) return;

  injectStyles();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = createOverlayHTML(state.lastParsed || null);
  document.body.appendChild(overlay);

  attachEventListeners(overlay);

  state.isVisible = true;

  // Auto-parse if no data
  if (!state.lastParsed) {
    parseAndUpdate();
  }
}

/**
 * Hide debug overlay
 */
export function hideOverlay(): void {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
  clearHighlights();
  state.isVisible = false;
}

/**
 * Toggle debug overlay
 */
export function toggleOverlay(): void {
  if (state.isVisible) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

/**
 * Check if overlay is visible
 */
export function isOverlayVisible(): boolean {
  return state.isVisible;
}
