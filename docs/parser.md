# ChatGPT Parser Documentation

## Overview

The ChatGPT parser extracts structured conversation data from ChatGPT web pages. It produces a normalized JSON format that is stable across DOM changes and suitable for storage, analysis, and export.

## Supported Hosts

- `chat.openai.com`
- `chatgpt.com`

## Data Model

### Schema Version 1.0

The parser outputs a `ChatDocument` with the following structure:

```typescript
{
  "schemaVersion": "1.0",
  "source": {
    "url": "https://chat.openai.com/c/abc123",
    "capturedAt": "2024-01-01T12:00:00.000Z",
    "platform": "chatgpt"
  },
  "chat": {
    "chatId": "abc123",
    "title": "My Conversation"
  },
  "messages": [
    {
      "id": "msg_a1b2c3_0",
      "index": 0,
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Hello, how are you?"
        }
      ]
    }
  ]
}
```

### Message Parts

Messages are broken down into semantic parts:

- **text**: Plain text content
- **code**: Code blocks with optional language
- **list**: Ordered or unordered lists
- **quote**: Blockquotes
- **link**: Hyperlinks with text and href
- **heading**: H1-H6 headings
- **imageRef**: Image references
- **unknown**: Fallback for unrecognized content

## Parser Features

### Resilient DOM Extraction

The parser uses multiple selector strategies to handle DOM changes:

1. **Primary selectors**: Most specific, target known ChatGPT structure
2. **Fallback selectors**: More general patterns
3. **Heuristics**: Content-based detection when selectors fail

Example selector config:

```typescript
{
  primary: ['[data-message-id]', '[data-testid*="message"]'],
  fallback: ['main > div > div', 'article'],
  heuristic: (el) => el.textContent.length > 5
}
```

### Stable Message IDs

Message IDs are generated deterministically using:

- Message role
- Normalized content (whitespace collapsed, UI noise removed)
- Message index (as salt for uniqueness)

Format: `msg_<hash>_<index>`

This ensures:
- Same conversation → same IDs (reproducibility)
- Different content → different IDs (uniqueness)
- Preserves order even if IDs change (via index field)

### Content Normalization

The parser:
- Removes UI buttons and toolbars ("Copy", "Regenerate", etc.)
- Preserves paragraph boundaries
- Extracts structured content (code, lists) separately
- Normalizes whitespace while preserving code formatting
- Handles nested lists and complex markup

### Role Detection

Message roles are detected using:
1. `data-role` attribute (highest priority)
2. Class name patterns (`user`, `assistant`, `bot`, `system`)
3. Fallback to `unknown` if undeterminable

## Usage

### In Content Script

```typescript
import { parseChatGpt } from '@/core/parser/parseChatGpt';

// Parse current page
const result = parseChatGpt(document, { debug: true });

console.log(result.document);
console.log(result.warnings); // Non-fatal issues
```

### With Options

```typescript
const result = parseChatGpt(document, {
  debug: true,      // Include DOM references in output
  baseUrl: '...',   // For resolving relative links
});
```

### Check if Page is Supported

```typescript
import { isChatGptPage } from '@/core/parser/parseChatGpt';

if (isChatGptPage(window.location.href)) {
  // Parse the page
}
```

### Wait for Content

```typescript
import { waitForConversationReady } from '@/core/parser/parseChatGpt';

// Wait up to 10 seconds for conversation to load
if (await waitForConversationReady(document, 10000)) {
  const result = parseChatGpt(document);
}
```

## Debug Mode

Enable the debug overlay to verify parsing:

### Keyboard Shortcut

Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to toggle the debug overlay.

### Via Storage

```javascript
// Enable debug overlay
browser.storage.local.set({ 'debug.parseOverlay': true });

// Disable
browser.storage.local.set({ 'debug.parseOverlay': false });
```

### Debug Overlay Features

- **Message counts**: Total messages and role distribution
- **Re-parse button**: Trigger parsing again
- **Copy JSON**: Copy parsed data to clipboard
- **Download JSON**: Save as file
- **Highlight messages**: Visual DOM mapping
- **Draggable**: Move overlay around the page

## Known Limitations

### Content Extraction

- **Attachments**: Stored as placeholder references only
- **Embedded media**: Only links/references captured, not content
- **Dynamic content**: Loaded after initial parse may be missed
- **Branching conversations**: Only the currently visible branch is captured

### DOM Dependencies

- Parser relies on semantic HTML structure
- Major ChatGPT UI redesigns may require parser updates
- Use fixtures in tests to catch breaking changes early

### Performance

- Parser is optimized for typical conversations (< 500 messages)
- Very long conversations may cause brief UI freeze
- Consider chunking or background parsing for huge chats

## Updating the Parser

When ChatGPT's DOM changes:

1. **Capture a new fixture**: Use the export tool
2. **Run tests**: Identify what broke
3. **Update selectors**: Add new patterns to `selectors.ts`
4. **Test fallbacks**: Ensure old pages still work
5. **Document changes**: Note version and date

### Adding New Selectors

Edit `src/core/parser/selectors.ts`:

```typescript
export const MESSAGE_BLOCKS: SelectorConfig = {
  primary: [
    // Add new selector here
    '[data-new-message-attr]',
    // Existing selectors
    '[data-message-id]',
  ],
  fallback: [...],
};
```

### Testing Changes

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Manual testing with debug overlay
# Enable overlay and verify on live ChatGPT page
```

## Troubleshooting

### No Messages Found

- Check if container selector matches: inspect `CONVERSATION_CONTAINER`
- Verify message blocks are detected: inspect `MESSAGE_BLOCKS`
- Use debug overlay to see what's being detected
- Capture a fixture for testing

### Incorrect Role Detection

- Add role-specific attributes to `ROLE_INDICATORS` in `selectors.ts`
- Check for new class name patterns in ChatGPT UI
- Consider visual position as fallback heuristic

### Missing Content

- Code blocks: Update `CODE_BLOCKS` selectors
- Lists: Verify `extractLists()` logic in `normalize.ts`
- Links/Images: Check extraction functions in `normalize.ts`

### Performance Issues

- Disable debug mode in production
- Avoid parsing in hot loops
- Consider debouncing re-parse triggers
- Use `waitForConversationReady()` to avoid premature parsing

## API Reference

See type definitions in `src/core/model/chat.ts` for complete API.

### Key Functions

- `parseChatGpt(doc, options)`: Main parser entry point
- `isChatGptPage(url)`: Check if URL is supported
- `waitForConversationReady(doc, timeout)`: Wait for content
- `findElement(root, config)`: Find element with fallbacks
- `detectRole(element)`: Determine message role
- `generateMessageId(role, parts, index)`: Create stable ID

## Examples

### Basic Parsing

```typescript
const result = parseChatGpt(document);
console.log(`Extracted ${result.document.messages.length} messages`);
```

### With Error Handling

```typescript
try {
  const result = parseChatGpt(document);
  if (result.warnings.length > 0) {
    console.warn('Parse warnings:', result.warnings);
  }
  // Use result.document
} catch (error) {
  console.error('Parse failed:', error);
}
```

### Filtering Messages

```typescript
const result = parseChatGpt(document);
const userMessages = result.document.messages.filter(m => m.role === 'user');
const codeMessages = result.document.messages.filter(m =>
  m.parts.some(p => p.type === 'code')
);
```

## See Also

- [Testing Assets Guide](./testing-assets.md)
- [Contributing Guide](../DEVELOPER.md)
- [Issue: Parser Implementation](https://github.com/yuchdev/AiChatSummarizer/issues/...)
