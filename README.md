# AI Chat Summarizer

A WebExtension for Firefox and Chromium-based browsers that allows you to parse, navigate, summarize, and export AI chat conversations from platforms like ChatGPT.

## Features

- **Parse ChatGPT Conversations**: Automatically extract conversation structure from ChatGPT pages with resilient DOM parsing
- **Debug Parse Overlay**: Visual debugging tool to verify parser correctness
  - View message counts and role distribution
  - Highlight message boundaries in DOM
  - Copy/download parsed JSON
  - Keyboard shortcut: `Ctrl+Shift+D`
- **Normalized Data Model**: Stable JSON schema for storage and export
  - Deterministic message IDs
  - Structured content parts (text, code, lists, links, etc.)
  - Platform-independent format
- **Tree View**: Navigate conversations as a tree structure with user/assistant messages
- **Search**: Find specific messages within conversations
- **Select & Summarize**: Select individual messages, subtrees, or entire conversations for summarization
- **Export**: Export conversations in multiple formats:
  - JSON (structured data)
  - Markdown (readable format)
  - Plain Text
  - SQLite (coming soon)
- **Cross-Browser**: MV3-compatible, works on Firefox and Chromium browsers
- **Test Infrastructure**: Comprehensive unit and integration tests with fixture-based testing

## Installation

### Development

1. Clone this repository:
   ```bash
   git clone https://github.com/yuchdev/AiChatSummarizer.git
   cd AiChatSummarizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in your browser:
   
   **Firefox:**
   - Open `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select any file in the `dist/` folder

   **Chrome/Edge:**
   - Open `chrome://extensions` or `edge://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

### Development Mode

To build continuously during development:
```bash
npm run dev
```

## Usage

### Basic Usage

1. **Navigate to ChatGPT**: Go to a ChatGPT conversation page (https://chat.openai.com or https://chatgpt.com)

2. **Automatic Parsing**: The extension automatically parses the conversation when the page loads

3. **View in Tree**: Click the extension icon and select "Open Conversation Viewer" to see the conversation in a tree structure

4. **Navigate & Select**: 
   - Click messages to select them
   - Use Ctrl+Click (Cmd+Click on Mac) to multi-select
   - Click the arrow icons to expand/collapse message trees

5. **Search**: Use the search box to find specific text in messages

6. **Summarize**: Select messages and click "Summarize" (summarization logic to be implemented)

7. **Export**: Click "Export" and choose your preferred format

### Debug Parse Overlay

Verify that the parser is working correctly with the debug overlay:

1. **Enable**: Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) on any ChatGPT page
2. **View Stats**: See message counts and role distribution
3. **Highlight Messages**: Click "Highlight Messages" to see DOM boundaries
4. **Export Data**: Use "Copy JSON" or "Download JSON" buttons
5. **Re-parse**: Click "Re-parse" to run the parser again

### Export Test Assets

Create test fixtures from live conversations:

```bash
npm run export:chat -- --url "https://chat.openai.com/c/abc123" --slug "my-chat"
```

Options:
- `--headful`: Show browser UI (useful for authentication)
- `--only-html`: Export only HTML snapshot
- `--only-json`: Export only parsed JSON

See [Testing Assets Guide](docs/testing-assets.md) for details.

## Architecture

- **Manifest V3**: Modern extension architecture compatible with latest browsers
- **TypeScript**: Type-safe code throughout
- **Vite**: Fast build system with HMR support
- **webextension-polyfill**: Cross-browser API compatibility

### Directory Structure

```
src/
├── background/          # Background service worker
│   └── background.ts
├── content/            # Content scripts for page parsing
│   └── content.ts
├── popup/              # Extension popup UI
│   ├── popup.html
│   └── popup.ts
├── ui/                 # Main conversation viewer UI
│   ├── ui.html
│   ├── ui.css
│   └── ui.ts
├── shared/             # Shared utilities and types
│   ├── types.ts
│   ├── storage.ts
│   └── messaging.ts
├── icons/              # Extension icons
└── manifest.json       # Extension manifest
```

## Development

### Key Components

- **Background Service**: Coordinates between content scripts and UI, manages storage
- **Content Script**: Parses ChatGPT DOM structure to extract conversations
  - Core parser: Resilient DOM extraction with selector fallbacks
  - Debug overlay: Visual parsing verification tool
  - Content extraction: Structured parts (text, code, lists, links)
- **UI Tab**: Displays conversations in a tree view with search and export capabilities
- **Storage**: Uses browser.storage.local for persisting conversations
- **Messaging**: Inter-component communication using browser.runtime messages

### Parser Architecture

The parser uses a multi-layered approach for resilience:

1. **Primary selectors**: Target current ChatGPT structure
2. **Fallback selectors**: Handle older/alternative structures
3. **Heuristics**: Content-based detection when selectors fail
4. **Normalization**: Produce consistent output regardless of input variation

See [Parser Documentation](docs/parser.md) for details.

### Testing

```bash
# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Type check
npm run typecheck

# Build
npm run build
```

### Adding Features

1. **New Export Format**: Add to `ExportFormat` enum in `types.ts` and implement in `ui.ts`
2. **Summarization**: Implement in `background.ts` `handleSummarize()` method
3. **New Platform**: Add content script patterns in `manifest.json` and create parser in `core/parser/`
4. **Parser Updates**: Modify selectors in `core/parser/selectors.ts` when DOM changes

### Creating Test Fixtures

Capture real conversations as test assets:

```bash
npm run export:chat -- --url "https://chat.openai.com/c/..." --slug "test-case"
```

See [Testing Assets Guide](docs/testing-assets.md) for fixture management.

## TODO

- [ ] Implement actual summarization (integrate with AI API)
- [ ] Add SQLite export functionality
- [ ] Support additional chat platforms (Claude, Bard, etc.)
- [ ] Add conversation comparison features
- [ ] Implement conversation statistics
- [ ] Add user preferences/settings
- [ ] Improve ChatGPT DOM parsing robustness

## Documentation

- [Parser Documentation](docs/parser.md) - Parser API and usage
- [Testing Assets Guide](docs/testing-assets.md) - Creating and managing test fixtures
- [Developer Guide](DEVELOPER.md) - Development setup and architecture
- [Implementation Summary](IMPLEMENTATION.md) - What's been built

## License

ISC License - See LICENSE file for details

## Contributing

Contributions are welcome! Please open an issue or PR on GitHub.
