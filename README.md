# AI Chat Summarizer

A WebExtension for Firefox and Chromium-based browsers that allows you to parse, navigate, summarize, and export AI chat conversations from platforms like ChatGPT.

## Features

- **Parse ChatGPT Conversations**: Automatically extract conversation structure from ChatGPT pages
- **Tree View**: Navigate conversations as a tree structure with user/assistant messages
- **Search**: Find specific messages within conversations
- **Select & Summarize**: Select individual messages, subtrees, or entire conversations for summarization
- **Export**: Export conversations in multiple formats:
  - JSON (structured data)
  - Markdown (readable format)
  - Plain Text
  - SQLite (coming soon)
- **Cross-Browser**: MV3-compatible, works on Firefox and Chromium browsers

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

1. **Navigate to ChatGPT**: Go to a ChatGPT conversation page (https://chat.openai.com or https://chatgpt.com)

2. **Parse Conversation**: Click the extension icon and select "Parse Current Page"

3. **View in Tree**: Click "Open Conversation Viewer" to see the conversation in a tree structure

4. **Navigate & Select**: 
   - Click messages to select them
   - Use Ctrl+Click (Cmd+Click on Mac) to multi-select
   - Click the arrow icons to expand/collapse message trees

5. **Search**: Use the search box to find specific text in messages

6. **Summarize**: Select messages and click "Summarize" (summarization logic to be implemented)

7. **Export**: Click "Export" and choose your preferred format

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
- **UI Tab**: Displays conversations in a tree view with search and export capabilities
- **Storage**: Uses browser.storage.local for persisting conversations
- **Messaging**: Inter-component communication using browser.runtime messages

### Adding Features

1. **New Export Format**: Add to `ExportFormat` enum in `types.ts` and implement in `ui.ts`
2. **Summarization**: Implement in `background.ts` `handleSummarize()` method
3. **New Platform**: Add content script patterns in `manifest.json` and parsing logic in `content.ts`

## TODO

- [ ] Implement actual summarization (integrate with AI API)
- [ ] Add SQLite export functionality
- [ ] Support additional chat platforms (Claude, Bard, etc.)
- [ ] Add conversation comparison features
- [ ] Implement conversation statistics
- [ ] Add user preferences/settings
- [ ] Improve ChatGPT DOM parsing robustness

## License

ISC License - See LICENSE file for details

## Contributing

Contributions are welcome! Please open an issue or PR on GitHub.
