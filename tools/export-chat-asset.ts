#!/usr/bin/env tsx

/**
 * Integration Test Asset Exporter
 * 
 * Exports ChatGPT conversations as test fixtures:
 * - HTML snapshot (sanitized)
 * - Parsed JSON (normalized)
 * - Metadata (capture info)
 * 
 * Usage:
 *   npm run export:chat -- --url "https://chat.openai.com/c/..." --slug "my-chat"
 *   npm run export:chat -- --url "https://chat.openai.com/c/..." --slug "my-chat" --headful
 */

import { chromium, type Browser, type Page } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

interface ExportOptions {
  url: string;
  slug: string;
  headful?: boolean;
  onlyHtml?: boolean;
  onlyJson?: boolean;
}

interface Metadata {
  url: string;
  capturedAt: string;
  toolVersion: string;
  parserSchemaVersion: string;
  notes?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ExportOptions {
  const args = process.argv.slice(2);
  const options: Partial<ExportOptions> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        options.url = args[++i];
        break;
      case '--slug':
        options.slug = args[++i];
        break;
      case '--headful':
        options.headful = true;
        break;
      case '--only-html':
        options.onlyHtml = true;
        break;
      case '--only-json':
        options.onlyJson = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  if (!options.url || !options.slug) {
    console.error('Error: --url and --slug are required');
    printHelp();
    process.exit(1);
  }

  return options as ExportOptions;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
ChatGPT Test Asset Exporter

Usage:
  npm run export:chat -- --url <url> --slug <slug> [options]

Required Arguments:
  --url <url>      URL of the ChatGPT conversation
  --slug <slug>    Short identifier for the fixture (e.g., "basic-chat")

Options:
  --headful        Run browser in headful mode (shows UI)
  --only-html      Export only HTML snapshot
  --only-json      Export only parsed JSON
  --help, -h       Show this help message

Examples:
  npm run export:chat -- --url "https://chat.openai.com/c/abc123" --slug "basic-chat"
  npm run export:chat -- --url "https://chatgpt.com/c/xyz789" --slug "code-chat" --headful

Output:
  Creates directory: assets/chats/<slug>/
  Files:
    - source.html: Sanitized HTML snapshot
    - parsed.json: Extracted conversation data
    - meta.json: Capture metadata
  `);
}

/**
 * Sanitize HTML for storage
 * Removes scripts, volatile attributes, etc.
 */
function sanitizeHtml(html: string): string {
  // Remove script tags
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove inline event handlers
  html = html.replace(/\s+on\w+="[^"]*"/gi, '');
  html = html.replace(/\s+on\w+='[^']*'/gi, '');
  
  // Remove volatile attributes
  const volatileAttrs = ['data-radix-', 'data-state', 'aria-activedescendant'];
  volatileAttrs.forEach((attr) => {
    const regex = new RegExp(`\\s+${attr}\\w*="[^"]*"`, 'gi');
    html = html.replace(regex, '');
  });

  return html;
}

/**
 * Export HTML snapshot
 */
async function exportHtml(page: Page, outputDir: string): Promise<void> {
  console.log('📸 Capturing HTML snapshot...');

  // Get the main conversation content
  const mainContent = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    return main.outerHTML;
  });

  // Sanitize HTML
  const sanitized = sanitizeHtml(mainContent);

  // Write to file
  const htmlPath = resolve(outputDir, 'source.html');
  writeFileSync(htmlPath, sanitized, 'utf-8');
  console.log(`✅ HTML saved: ${htmlPath}`);
}

/**
 * Export parsed JSON
 */
async function exportJson(page: Page, outputDir: string): Promise<void> {
  console.log('🔍 Parsing conversation...');

  // Inject parser and extract conversation
  const result = await page.evaluate(async () => {
    // This would normally import the parser, but since we're in browser context,
    // we need to inject it or use a bundled version
    // For now, return a placeholder that shows the structure

    // Helper function to extract text
    const extractText = (el: Element): string => {
      return (el.textContent || '').trim();
    };

    // Find conversation container
    const main = document.querySelector('main');
    if (!main) {
      throw new Error('Main element not found');
    }

    // Find message blocks - try multiple selectors
    const messageSelectors = [
      '[data-message-id]',
      '[data-testid*="conversation-turn"]',
      '[data-testid*="message"]',
    ];

    let messages: Element[] = [];
    for (const selector of messageSelectors) {
      messages = Array.from(main.querySelectorAll(selector));
      if (messages.length > 0) break;
    }

    if (messages.length === 0) {
      // Fallback: find all divs in main that look like messages
      const allDivs = Array.from(main.querySelectorAll('div'));
      messages = allDivs.filter((div) => {
        const text = extractText(div);
        return text.length > 20 && div.querySelector('p, pre, code, ul, ol');
      });
    }

    // Parse messages
    const parsedMessages = messages.map((el, index) => {
      const text = extractText(el);
      
      // Detect role
      let role = 'unknown';
      const classes = el.className.toLowerCase();
      const dataRole = el.getAttribute('data-role');
      
      if (dataRole === 'user' || classes.includes('user')) {
        role = 'user';
      } else if (dataRole === 'assistant' || classes.includes('assistant') || classes.includes('bot')) {
        role = 'assistant';
      }

      // Extract code blocks
      const codeBlocks = Array.from(el.querySelectorAll('pre code, pre, code[class*="language-"]'));
      const codeParts = codeBlocks.map((code) => ({
        type: 'code',
        lang: null,
        code: extractText(code),
      }));

      // Extract lists
      const lists = Array.from(el.querySelectorAll('ol, ul'));
      const listParts = lists.map((list) => {
        const items = Array.from(list.querySelectorAll('li')).map(extractText);
        return {
          type: 'list',
          ordered: list.tagName.toLowerCase() === 'ol',
          items,
        };
      });

      // Create basic message
      return {
        id: `msg_${index}`,
        index,
        role,
        parts: [
          ...codeParts,
          ...listParts,
          { type: 'text', text },
        ],
      };
    });

    // Get title
    const titleEl = document.querySelector('h1');
    const title = titleEl ? extractText(titleEl) : 'Untitled';

    // Get chat ID from URL
    const urlMatch = window.location.href.match(/\/c\/([a-zA-Z0-9-_]+)/);
    const chatId = urlMatch ? urlMatch[1] : undefined;

    return {
      document: {
        schemaVersion: '1.0',
        source: {
          url: window.location.href,
          capturedAt: new Date().toISOString(),
          platform: 'chatgpt',
        },
        chat: {
          chatId,
          title,
        },
        messages: parsedMessages,
      },
      warnings: [],
    };
  });

  // Write to file
  const jsonPath = resolve(outputDir, 'parsed.json');
  writeFileSync(jsonPath, JSON.stringify(result.document, null, 2), 'utf-8');
  console.log(`✅ JSON saved: ${jsonPath}`);
  console.log(`   Messages: ${result.document.messages.length}`);
  
  if (result.warnings.length > 0) {
    console.log(`   Warnings: ${result.warnings.length}`);
    result.warnings.forEach((w) => console.log(`     - ${w}`));
  }
}

/**
 * Export metadata
 */
function exportMetadata(options: ExportOptions, outputDir: string): void {
  const metadata: Metadata = {
    url: options.url,
    capturedAt: new Date().toISOString(),
    toolVersion: '1.0.0',
    parserSchemaVersion: '1.0',
    notes: `Exported with export-chat-asset tool`,
  };

  const metaPath = resolve(outputDir, 'meta.json');
  writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`✅ Metadata saved: ${metaPath}`);
}

/**
 * Main export function
 */
async function exportChat(options: ExportOptions): Promise<void> {
  console.log(`\n🚀 Starting export for: ${options.slug}`);
  console.log(`   URL: ${options.url}\n`);

  // Prepare output directory
  const outputDir = resolve(__dirname, '..', 'assets', 'chats', options.slug);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${outputDir}\n`);
  }

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: !options.headful,
      // Use persistent context for auth
      // This is commented out to avoid auth issues in CI
      // For local use, you can uncomment and provide a profile dir
      // args: ['--user-data-dir=./.pw-profile'],
    });

    page = await browser.newPage();

    // Navigate to URL
    console.log('📍 Navigating to conversation...');
    await page.goto(options.url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for main content to load
    await page.waitForSelector('main', { timeout: 30000 });
    
    // Additional wait for dynamic content
    await page.waitForTimeout(2000);

    // Export HTML if requested
    if (!options.onlyJson) {
      await exportHtml(page, outputDir);
    }

    // Export JSON if requested
    if (!options.onlyHtml) {
      await exportJson(page, outputDir);
    }

    // Export metadata
    exportMetadata(options, outputDir);

    console.log(`\n✨ Export complete! Files saved to: ${outputDir}\n`);
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  exportChat(options).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { exportChat, type ExportOptions };
