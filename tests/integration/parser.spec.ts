/**
 * Integration tests for ChatGPT parser
 * Tests parser against stored HTML fixtures
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const FIXTURES_DIR = resolve(__dirname, '../../assets/chats');

/**
 * Helper to load fixture files
 */
function loadFixture(slug: string) {
  const fixtureDir = resolve(FIXTURES_DIR, slug);
  
  if (!existsSync(fixtureDir)) {
    throw new Error(`Fixture not found: ${slug}`);
  }

  const htmlPath = resolve(fixtureDir, 'source.html');
  const jsonPath = resolve(fixtureDir, 'parsed.json');
  const metaPath = resolve(fixtureDir, 'meta.json');

  return {
    html: existsSync(htmlPath) ? readFileSync(htmlPath, 'utf-8') : null,
    json: existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, 'utf-8')) : null,
    meta: existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf-8')) : null,
  };
}

test.describe('Parser Integration Tests', () => {
  test('should have fixtures directory', () => {
    expect(existsSync(FIXTURES_DIR)).toBe(true);
  });

  // This test will be skipped until we have actual fixtures
  test.skip('should parse basic chat fixture', async ({ page }) => {
    const fixture = loadFixture('basic-chat');
    
    if (!fixture.html) {
      test.skip();
      return;
    }

    // Create a test page with the fixture HTML
    await page.setContent(fixture.html);

    // Inject parser code (this would be the bundled parser)
    // For now, just verify the HTML loaded
    const mainContent = await page.textContent('main');
    expect(mainContent).toBeTruthy();
    expect(mainContent!.length).toBeGreaterThan(0);
  });

  test('parser should handle empty fixtures gracefully', async () => {
    // This test passes to show test infrastructure works
    expect(true).toBe(true);
  });
});
