# Developer Guide

## Overview

AI Chat Summarizer is a browser extension built with TypeScript, targeting Manifest V3 for compatibility with modern Firefox and Chromium-based browsers.

## Architecture

### Components

1. **Background Service Worker** (`src/background/background.ts`)
   - Coordinates between content scripts and UI
   - Handles message routing
   - Manages conversation storage
   - Placeholder for summarization logic

2. **Content Script** (`src/content/content.ts`)
   - Injects into ChatGPT pages
   - Parses conversation DOM structure
   - Extracts messages and metadata
   - Sends parsed data to background

3. **Popup UI** (`src/popup/`)
   - Browser action popup
   - Quick access to main UI
   - Trigger page parsing

4. **Main UI Tab** (`src/ui/`)
   - Full-featured conversation viewer
   - Tree widget for message navigation
   - Search functionality
   - Export capabilities
   - Selection and summarization controls

5. **Shared Utilities** (`src/shared/`)
   - `types.ts`: TypeScript interfaces and enums
   - `storage.ts`: Browser storage wrapper
   - `messaging.ts`: Inter-component communication

### Data Flow

```
ChatGPT Page → Content Script → Background → Storage
                                    ↓
                              Main UI Tab
                                    ↓
                          Export/Summarize Actions
```

## Building

```bash
# Install dependencies
npm install

# Development build (with watch mode)
npm run dev

# Production build
npm run build
```

Build output goes to `dist/` directory.

## Project Structure

```
AiChatSummarizer/
├── src/
│   ├── background/
│   │   └── background.ts       # Service worker
│   ├── content/
│   │   └── content.ts          # Content script for ChatGPT
│   ├── popup/
│   │   ├── popup.html          # Extension popup
│   │   └── popup.ts            # Popup logic
│   ├── ui/
│   │   ├── ui.html             # Main UI tab
│   │   ├── ui.css              # UI styles
│   │   └── ui.ts               # UI controller
│   ├── shared/
│   │   ├── types.ts            # Shared types
│   │   ├── storage.ts          # Storage API wrapper
│   │   └── messaging.ts        # Messaging utilities
│   ├── icons/                  # Extension icons
│   └── manifest.json           # Extension manifest
├── dist/                       # Build output (gitignored)
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite build config
└── package.json
```

## Key Technologies

- **TypeScript**: Type-safe development
- **Vite**: Fast build system with ES modules
- **webextension-polyfill**: Cross-browser API compatibility
- **Manifest V3**: Modern extension architecture

## Development Workflow

1. **Start development build**:
   ```bash
   npm run dev
   ```

2. **Load extension in browser**:
   - Firefox: `about:debugging` → Load Temporary Add-on → select any file in `dist/`
   - Chrome: `chrome://extensions` → Load unpacked → select `dist/` folder

3. **Make changes**: Files will rebuild automatically in dev mode

4. **Reload extension**: Click reload in browser extension page after changes

## Testing

### Manual Testing Workflow

1. Navigate to a ChatGPT conversation
2. Click extension icon
3. Click "Parse Current Page"
4. Click "Open Conversation Viewer"
5. Verify conversation appears in tree view
6. Test search functionality
7. Test message selection (click, Ctrl+click)
8. Test export (JSON, Markdown, Text)

## Adding Features

### Adding a New Export Format

1. Add format to `ExportFormat` enum in `src/shared/types.ts`
2. Add export handler in `src/ui/ui.ts` `handleExport()` method
3. Add menu item in `src/ui/ui.html`

### Adding Support for New Chat Platform

1. Add URL patterns to `manifest.json`:
   - `host_permissions`
   - `content_scripts.matches`

2. Update `src/content/content.ts`:
   - Add platform-specific DOM selectors
   - Handle different message structures

### Implementing Summarization

The summarization feature is currently a placeholder. To implement:

1. Choose AI service (OpenAI, local model, etc.)
2. Add API configuration to `src/shared/types.ts`
3. Implement in `src/background/background.ts` `handleSummarize()`
4. Consider adding settings UI for API keys/configuration

## Cross-Browser Compatibility

The extension uses:
- **webextension-polyfill** for API compatibility
- **Manifest V3** for future-proofing
- **browser_specific_settings** for Firefox extension ID

### Browser Differences

- Firefox: Uses `browser.*` API natively
- Chrome: Polyfill converts to `chrome.*` API
- Service worker vs background page differences handled by MV3

## Code Style

- TypeScript strict mode enabled
- ES2020+ features
- Async/await for asynchronous operations
- Class-based organization for components

## Troubleshooting

### Build Issues

- Clear `dist/` and `node_modules/.vite-temp/`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Extension Not Loading

- Check manifest.json syntax
- Verify all referenced files exist in dist/
- Check browser console for errors

### Content Script Not Running

- Verify URL matches patterns in manifest.json
- Check content script injection timing
- Look for CSP (Content Security Policy) issues

## Future Enhancements

- [ ] SQLite export implementation
- [ ] AI summarization integration
- [ ] Support for Claude, Bard, and other platforms
- [ ] Conversation comparison features
- [ ] User settings/preferences UI
- [ ] Automated tests
- [ ] CI/CD pipeline
