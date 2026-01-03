# Testing Assets Guide

## Overview

Test fixtures are snapshots of real ChatGPT conversations stored in version control. They enable:

- **Reproducible tests**: Same input → same output
- **Offline testing**: No live ChatGPT access needed
- **DOM drift detection**: Catch breaking changes early
- **CI/CD integration**: Run tests automatically

## Directory Structure

```
assets/
  chats/
    <slug>/
      source.html       # Sanitized HTML snapshot
      parsed.json       # Expected parser output
      meta.json         # Capture metadata
```

Example:

```
assets/
  chats/
    basic-chat/
      source.html
      parsed.json
      meta.json
    code-heavy/
      source.html
      parsed.json
      meta.json
```

## Creating Test Fixtures

### Using the Export Tool

The `export-chat-asset` tool captures live conversations as fixtures.

#### Prerequisites

1. You must have access to the ChatGPT conversation you want to export
2. For authenticated conversations, you'll need to login in the browser

#### Basic Usage

```bash
npm run export:chat -- --url "https://chat.openai.com/c/abc123" --slug "my-chat"
```

#### Options

```bash
# Headful mode (shows browser, useful for auth)
npm run export:chat -- \
  --url "https://chat.openai.com/c/abc123" \
  --slug "my-chat" \
  --headful

# Export only HTML
npm run export:chat -- \
  --url "https://chat.openai.com/c/abc123" \
  --slug "my-chat" \
  --only-html

# Export only JSON
npm run export:chat -- \
  --url "https://chat.openai.com/c/abc123" \
  --slug "my-chat" \
  --only-json
```

#### Authentication

For conversations requiring login:

1. Run in headful mode: `--headful`
2. Login manually when browser opens
3. Navigate to conversation
4. Tool will capture once loaded

### Manual Export Steps

If the tool doesn't work:

1. **Save HTML**: Open conversation, right-click, "Save Page As" → Complete HTML
2. **Extract main content**: Edit to keep only `<main>` element
3. **Sanitize**: Remove `<script>` tags and event handlers
4. **Parse**: Run parser and save output as `parsed.json`
5. **Add metadata**: Create `meta.json` manually

## Fixture Requirements

### Required Files

Each fixture must have:

- `source.html`: The conversation HTML
- `parsed.json`: Expected parser output
- `meta.json`: Metadata about the fixture

### HTML Sanitization

The HTML should be:

✅ **Include**:
- Main conversation content
- Message structure and text
- Code blocks, lists, formatting
- Semantic HTML attributes

❌ **Remove**:
- `<script>` tags
- Inline event handlers (`onclick`, etc.)
- Personal information (names, emails, etc.)
- Session tokens, auth cookies
- Volatile attributes (`data-radix-*`, `data-state`)
- External resource URLs (images, etc.)

### JSON Structure

`parsed.json` should match the `ChatDocument` schema:

```json
{
  "schemaVersion": "1.0",
  "source": {
    "url": "https://chat.openai.com/c/...",
    "capturedAt": "2024-01-01T12:00:00.000Z",
    "platform": "chatgpt"
  },
  "chat": {
    "chatId": "abc123",
    "title": "Conversation Title"
  },
  "messages": [...]
}
```

### Metadata Format

`meta.json`:

```json
{
  "url": "https://chat.openai.com/c/abc123",
  "capturedAt": "2024-01-01T12:00:00.000Z",
  "toolVersion": "1.0.0",
  "parserSchemaVersion": "1.0",
  "notes": "Basic conversation with code blocks"
}
```

## Recommended Fixtures

Create fixtures covering:

### Essential Coverage

1. **basic-chat**: Simple user/assistant exchange
   - 5-10 messages
   - Plain text only
   - Tests basic parsing

2. **code-heavy**: Multiple code blocks
   - Various languages (Python, JavaScript, etc.)
   - Inline code and multi-line blocks
   - Tests code extraction

3. **mixed-content**: Rich formatting
   - Lists (ordered and unordered)
   - Links
   - Quotes
   - Headings
   - Tests content normalization

4. **long-conversation**: Many messages
   - 50+ messages
   - Tests performance and stability
   - Tests message ordering

### Optional Coverage

5. **empty-messages**: Edge cases
   - Very short messages
   - Messages with only whitespace
   - Tests robustness

6. **nested-lists**: Complex structure
   - Nested lists
   - Mixed list types
   - Tests deep content extraction

7. **special-chars**: Unicode and escaping
   - Emoji
   - Math symbols
   - Special characters
   - Tests text normalization

## Using Fixtures in Tests

### Unit Tests

Load HTML fixture and test parsing:

```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseChatGpt } from '@/core/parser/parseChatGpt';

const html = readFileSync(
  resolve(__dirname, '../fixtures/basic-chat/source.html'),
  'utf-8'
);

// Parse in test environment
const doc = new DOMParser().parseFromString(html, 'text/html');
const result = parseChatGpt(doc);

// Verify against expected
const expected = JSON.parse(
  readFileSync(
    resolve(__dirname, '../fixtures/basic-chat/parsed.json'),
    'utf-8'
  )
);

expect(result.document).toEqual(expected);
```

### Integration Tests (Playwright)

Load fixture in browser context:

```typescript
import { test } from '@playwright/test';

test('parse basic-chat fixture', async ({ page }) => {
  const html = readFileSync('./assets/chats/basic-chat/source.html', 'utf-8');
  
  await page.setContent(html);
  
  // Inject parser and run
  const result = await page.evaluate(() => {
    // Parser code here
    return parseChatGpt(document);
  });
  
  // Assertions
  expect(result.document.messages).toHaveLength(10);
});
```

## Updating Fixtures

When ChatGPT's DOM changes:

### Detecting Outdated Fixtures

Tests will fail if DOM structure changed. Look for:

- "Container not found" errors
- "No messages found" warnings
- Different message counts
- Missing content

### Update Process

1. **Re-capture**: Use export tool on same conversation
2. **Compare**: Diff old vs new `source.html`
3. **Update parser**: Add new selectors if needed
4. **Regenerate JSON**: Parse updated HTML
5. **Update meta**: Note DOM version change
6. **Test**: Verify all tests pass

### Version History

Add notes to `meta.json`:

```json
{
  ...
  "notes": "Updated 2024-01-15: New data-testid attributes",
  "domVersion": "2024-01",
  "updates": [
    {
      "date": "2024-01-15",
      "reason": "ChatGPT UI redesign",
      "changes": "New message wrapper structure"
    }
  ]
}
```

## Best Practices

### Fixture Selection

- ✅ Pick representative conversations
- ✅ Cover edge cases
- ✅ Include different content types
- ❌ Don't use extremely large chats (> 500 messages)
- ❌ Avoid conversations with sensitive data

### Sanitization

- ✅ Review HTML before committing
- ✅ Remove personal information
- ✅ Remove auth tokens
- ✅ Check for embedded secrets
- ❌ Don't sanitize so much that tests are invalid

### Maintenance

- ✅ Update fixtures when DOM changes
- ✅ Document why each fixture exists
- ✅ Keep fixtures minimal (smaller is better)
- ✅ Version control all fixture files
- ❌ Don't accumulate too many fixtures

### Testing

- ✅ Run tests locally before committing
- ✅ Verify fixtures in CI
- ✅ Test parser against all fixtures
- ❌ Don't skip fixture tests in PR checks

## Troubleshooting

### Export Tool Fails

**Problem**: Tool can't access conversation

**Solutions**:
- Use `--headful` and login manually
- Check URL is correct and complete
- Verify conversation still exists
- Try different browser in tool config

### Sanitized HTML Too Large

**Problem**: Fixture HTML file is huge

**Solutions**:
- Remove unnecessary wrapper divs
- Keep only `<main>` content
- Remove CSS styles
- Strip base64 images
- Consider splitting into multiple fixtures

### Tests Pass Locally, Fail in CI

**Problem**: Different behavior in CI environment

**Solutions**:
- Check browser version differences
- Verify all fixtures committed
- Check file paths are correct
- Ensure no hardcoded paths
- Review CI logs for specific errors

### Fixtures Become Outdated

**Problem**: Tests fail after ChatGPT update

**Solutions**:
- Re-export fixtures with new DOM
- Update parser selectors
- Add fallback selectors
- Document DOM version in meta
- Create issue if breaking change

## CI Integration

### GitHub Actions

Example workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test              # Unit tests
      - run: npm run test:integration  # Integration tests
```

### Fixture Management in CI

- **Include fixtures**: Commit to git (they're text files)
- **No auth needed**: Tests use stored fixtures only
- **Fast execution**: No network requests
- **Deterministic**: Same input → same output

## Example Workflows

### Adding a New Test Case

```bash
# 1. Export fixture
npm run export:chat -- \
  --url "https://chat.openai.com/c/abc123" \
  --slug "new-test-case"

# 2. Review and sanitize
vim assets/chats/new-test-case/source.html

# 3. Verify JSON output
cat assets/chats/new-test-case/parsed.json | jq .

# 4. Write test
# Add test in tests/integration/parser.spec.ts

# 5. Run tests
npm run test:integration

# 6. Commit
git add assets/chats/new-test-case/
git commit -m "Add new-test-case fixture"
```

### Updating Existing Fixture

```bash
# 1. Re-export
npm run export:chat -- \
  --url "https://chat.openai.com/c/abc123" \
  --slug "existing-case"

# 2. Check diff
git diff assets/chats/existing-case/

# 3. Update meta.json
# Add note about why update was needed

# 4. Test
npm run test:integration

# 5. Commit
git add assets/chats/existing-case/
git commit -m "Update existing-case fixture (DOM change)"
```

## See Also

- [Parser Documentation](./parser.md)
- [Developer Guide](../DEVELOPER.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
