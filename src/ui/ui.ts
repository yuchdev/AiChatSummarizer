import browser from 'webextension-polyfill';
import { ConversationTree, MessageNode, ExportFormat, MessageType } from '../shared/types';
import { Storage } from '../shared/storage';
import { Messaging } from '../shared/messaging';
import './ui.css';

/**
 * UI controller for the conversation viewer
 */
class ConversationUI {
  private conversations: Record<string, ConversationTree> = {};
  private currentConversation: ConversationTree | null = null;
  private selectedNodes: Set<string> = new Set();
  private searchTerm: string = '';

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('Initializing Conversation UI');

    // Load conversations from storage
    await this.loadConversations();

    // Set up event listeners
    this.setupEventListeners();

    // Listen for storage changes
    browser.storage.onChanged.addListener(this.handleStorageChange.bind(this));
  }

  private async loadConversations(): Promise<void> {
    this.conversations = await Storage.getConversations();
    this.renderConversationList();
  }

  private setupEventListeners(): void {
    // Search
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchTerm = (e.target as HTMLInputElement).value;
      this.performSearch();
    });

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn?.addEventListener('click', () => this.loadConversations());

    // Summarize button
    const summarizeBtn = document.getElementById('summarizeBtn');
    summarizeBtn?.addEventListener('click', () => this.handleSummarize());

    // Export buttons
    const exportMenu = document.getElementById('exportMenu');
    exportMenu?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') {
        e.preventDefault();
        const format = target.getAttribute('data-format') as ExportFormat;
        this.handleExport(format);
      }
    });
  }

  private renderConversationList(): void {
    const listElement = document.getElementById('conversationList');
    if (!listElement) return;

    const conversationArray = Object.values(this.conversations);
    
    if (conversationArray.length === 0) {
      listElement.innerHTML = '<div style="padding: 16px; text-align: center; color: #999;">No conversations yet</div>';
      return;
    }

    listElement.innerHTML = conversationArray
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((conv) => `
        <div class="conversation-item" data-id="${conv.id}">
          <h3>${this.escapeHtml(conv.title || 'Untitled')}</h3>
          <p>${new Date(conv.timestamp).toLocaleString()}</p>
        </div>
      `)
      .join('');

    // Add click listeners
    listElement.querySelectorAll('.conversation-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        if (id) this.loadConversation(id);
      });
    });
  }

  private loadConversation(id: string): void {
    this.currentConversation = this.conversations[id];
    if (!this.currentConversation) return;

    // Update active state
    document.querySelectorAll('.conversation-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-id') === id);
    });

    this.selectedNodes.clear();
    this.renderTreeView();
    this.updateToolbar();
  }

  private renderTreeView(): void {
    const treeView = document.getElementById('treeView');
    if (!treeView || !this.currentConversation) return;

    treeView.innerHTML = this.renderNode(this.currentConversation.root);
  }

  private renderNode(node: MessageNode, level: number = 0): string {
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = this.selectedNodes.has(node.id);
    
    let html = `
      <div class="tree-node" data-node-id="${node.id}" data-level="${level}">
        <div class="tree-node-header ${isSelected ? 'selected' : ''}" data-node-id="${node.id}">
    `;

    if (hasChildren) {
      html += `<span class="tree-node-toggle">▼</span>`;
    } else {
      html += `<span class="tree-node-toggle" style="opacity: 0.3;">•</span>`;
    }

    html += `
          <span class="tree-node-role ${node.role}">${node.role}</span>
          <div class="tree-node-content">${this.highlightSearch(this.escapeHtml(node.content))}</div>
        </div>
    `;

    if (hasChildren) {
      html += `<div class="tree-node-children">`;
      node.children!.forEach((child) => {
        html += this.renderNode(child, level + 1);
      });
      html += `</div>`;
    }

    html += `</div>`;

    // Add event listeners after rendering
    setTimeout(() => {
      const nodeElement = document.querySelector(`[data-node-id="${node.id}"] .tree-node-header`);
      nodeElement?.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const mouseEvent = e as MouseEvent;
        if (target.classList.contains('tree-node-toggle')) {
          this.toggleNode(node.id);
        } else {
          this.toggleSelection(node.id, mouseEvent.ctrlKey || mouseEvent.metaKey);
        }
      });
    }, 0);

    return html;
  }

  private toggleNode(nodeId: string): void {
    const nodeElement = document.querySelector(`[data-node-id="${nodeId}"] > .tree-node-children`);
    nodeElement?.classList.toggle('collapsed');
    
    const toggle = document.querySelector(`[data-node-id="${nodeId}"] .tree-node-toggle`);
    if (toggle) {
      toggle.textContent = nodeElement?.classList.contains('collapsed') ? '▶' : '▼';
    }
  }

  private toggleSelection(nodeId: string, multiSelect: boolean): void {
    if (!multiSelect) {
      this.selectedNodes.clear();
    }

    if (this.selectedNodes.has(nodeId)) {
      this.selectedNodes.delete(nodeId);
    } else {
      this.selectedNodes.add(nodeId);
    }

    // Update UI
    document.querySelectorAll('.tree-node-header').forEach((header) => {
      const id = header.getAttribute('data-node-id');
      header.classList.toggle('selected', id ? this.selectedNodes.has(id) : false);
    });

    this.updateToolbar();
  }

  private updateToolbar(): void {
    const selectionInfo = document.getElementById('selectionInfo');
    const summarizeBtn = document.getElementById('summarizeBtn') as HTMLButtonElement;
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;

    const count = this.selectedNodes.size;
    
    if (selectionInfo) {
      if (count === 0) {
        selectionInfo.textContent = 'No messages selected';
      } else {
        selectionInfo.textContent = `${count} message${count > 1 ? 's' : ''} selected`;
      }
    }

    if (summarizeBtn) {
      summarizeBtn.disabled = !this.currentConversation;
    }

    if (exportBtn) {
      exportBtn.disabled = !this.currentConversation;
    }
  }

  private performSearch(): void {
    if (!this.currentConversation) return;
    this.renderTreeView();
  }

  private highlightSearch(text: string): string {
    if (!this.searchTerm) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  private async handleSummarize(): Promise<void> {
    if (!this.currentConversation) return;

    const nodeIds = this.selectedNodes.size > 0 
      ? Array.from(this.selectedNodes) 
      : undefined;

    try {
      const response = await Messaging.sendToBackground({
        type: MessageType.SUMMARIZE,
        payload: { nodeIds },
      });

      alert(`Summary: ${response.summary || 'No summary available'}`);
    } catch (error) {
      alert('Error creating summary: ' + error);
    }
  }

  private async handleExport(format: ExportFormat): Promise<void> {
    if (!this.currentConversation) return;

    const nodeIds = this.selectedNodes.size > 0 
      ? Array.from(this.selectedNodes) 
      : undefined;

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case ExportFormat.JSON:
          content = this.exportToJSON(nodeIds);
          filename = `conversation_${this.currentConversation.id}.json`;
          mimeType = 'application/json';
          break;

        case ExportFormat.MARKDOWN:
          content = this.exportToMarkdown(nodeIds);
          filename = `conversation_${this.currentConversation.id}.md`;
          mimeType = 'text/markdown';
          break;

        case ExportFormat.TEXT:
          content = this.exportToText(nodeIds);
          filename = `conversation_${this.currentConversation.id}.txt`;
          mimeType = 'text/plain';
          break;

        case ExportFormat.SQLITE:
          alert('SQLite export not yet implemented');
          return;

        default:
          alert('Unknown export format');
          return;
      }

      this.downloadFile(content, filename, mimeType);
    } catch (error) {
      alert('Error exporting: ' + error);
    }
  }

  private exportToJSON(nodeIds?: string[]): string {
    if (!this.currentConversation) return '{}';

    if (nodeIds && nodeIds.length > 0) {
      // Export selected nodes
      const selectedMessages = this.getNodesByIds(nodeIds);
      return JSON.stringify({ messages: selectedMessages }, null, 2);
    }

    // Export full conversation
    return JSON.stringify(this.currentConversation, null, 2);
  }

  private exportToMarkdown(nodeIds?: string[]): string {
    if (!this.currentConversation) return '';

    let md = `# ${this.currentConversation.title}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n\n`;
    md += `---\n\n`;

    const nodesToExport = nodeIds && nodeIds.length > 0
      ? this.getNodesByIds(nodeIds)
      : this.getAllMessages(this.currentConversation.root);

    nodesToExport.forEach((node) => {
      md += `## ${node.role.toUpperCase()}\n\n`;
      md += `${node.content}\n\n`;
      md += `---\n\n`;
    });

    return md;
  }

  private exportToText(nodeIds?: string[]): string {
    if (!this.currentConversation) return '';

    let text = `${this.currentConversation.title}\n`;
    text += `Exported on ${new Date().toLocaleString()}\n`;
    text += `${'='.repeat(50)}\n\n`;

    const nodesToExport = nodeIds && nodeIds.length > 0
      ? this.getNodesByIds(nodeIds)
      : this.getAllMessages(this.currentConversation.root);

    nodesToExport.forEach((node) => {
      text += `[${node.role.toUpperCase()}]\n`;
      text += `${node.content}\n\n`;
    });

    return text;
  }

  private getAllMessages(node: MessageNode): MessageNode[] {
    const messages: MessageNode[] = [];
    
    if (node.role !== 'system') {
      messages.push(node);
    }

    if (node.children) {
      node.children.forEach((child) => {
        messages.push(...this.getAllMessages(child));
      });
    }

    return messages;
  }

  private getNodesByIds(nodeIds: string[]): MessageNode[] {
    if (!this.currentConversation) return [];

    const nodes: MessageNode[] = [];
    const findNodes = (node: MessageNode) => {
      if (nodeIds.includes(node.id)) {
        nodes.push(node);
      }
      if (node.children) {
        node.children.forEach(findNodes);
      }
    };

    findNodes(this.currentConversation.root);
    return nodes;
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private handleStorageChange(
    changes: { [key: string]: browser.Storage.StorageChange },
    areaName: string
  ): void {
    if (areaName === 'local' && changes.conversations) {
      this.loadConversations();
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Initialize the UI
new ConversationUI();
