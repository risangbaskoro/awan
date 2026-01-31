import Awan from "main";
import { Modal, App, setIcon, TFolder } from "obsidian";

interface FolderNode {
    folder: TFolder;
    children: FolderNode[];
    depth: number;
}

/** Modal to configure excluded folders. */

export class ExcludedFoldersModal extends Modal {
    private excludedFolders: Set<string> = new Set();
    private folderList: HTMLElement;

    constructor(app: App, private plugin: Awan) {
        super(app);

        this.setTitle(`Excluded folders`);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('p', { text: 'Select folders to exclude from syncing:' });

        // Initialize excluded folders from settings
        this.excludedFolders = new Set(this.plugin.settings.selectiveSync.excludedFolders);

        // Create folder list container
        this.folderList = contentEl.createDiv('awan-folder-list');

        // Build folder tree and render
        const folderTree = this.buildFolderTree();
        this.renderFolderTree(folderTree);

        // Add buttons at the bottom
        const buttonContainer = contentEl.createDiv('awan-modal-button-container');

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'mod-cancel'
        });
        cancelButton.onclick = () => this.close();

        const saveButton = buttonContainer.createEl('button', {
            text: 'Save',
            cls: 'mod-cta'
        });
        saveButton.onclick = async () => {
            this.plugin.settings.selectiveSync.excludedFolders = Array.from(this.excludedFolders);
            await this.plugin.saveSettings();
            this.close();
        };
    }

    private buildFolderTree(): FolderNode[] {
        const folders = this.app.vault.getAllFolders();

        // Create a map for quick lookup
        const folderMap = new Map<string, FolderNode>();
        const rootNodes: FolderNode[] = [];

        // Initialize all folder nodes
        folders.forEach(folder => {
            folderMap.set(folder.path, {
                folder,
                children: [],
                depth: folder.path.split('/').length - 1
            });
        });

        // Build the tree structure
        folders.forEach(folder => {
            const node = folderMap.get(folder.path)!;
            const parentPath = folder.path.includes('/') ? folder.path.substring(0, folder.path.lastIndexOf('/')) : '';

            if (parentPath && folderMap.has(parentPath)) {
                folderMap.get(parentPath)!.children.push(node);
            } else {
                rootNodes.push(node);
            }
        });

        // Sort nodes alphabetically
        const sortNodes = (nodes: FolderNode[]) => {
            nodes.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
            nodes.forEach(node => sortNodes(node.children));
        };
        sortNodes(rootNodes);

        return rootNodes;
    }

    private renderFolderTree(nodes: FolderNode[]) {
        this.folderList.empty();

        const renderNode = (node: FolderNode) => {
            const folderEl = this.folderList.createDiv('awan-folder-item');
            const indent = node.depth * 20;
            folderEl.style.marginLeft = `${indent}px`;

            // Add folder icon
            const iconEl = folderEl.createSpan('awan-folder-icon');
            setIcon(iconEl, 'folder');

            // Add folder name
            const nameEl = folderEl.createSpan('awan-folder-name');
            nameEl.textContent = node.folder.name;

            // Check if this folder or any parent is excluded
            const isExcluded = this.isFolderExcluded(node.folder.path);
            if (isExcluded) {
                folderEl.classList.add('excluded');
            }

            // Handle click
            folderEl.addEventListener('click', () => {
                this.toggleFolder(node.folder.path);
                // Re-render the entire tree to update colors
                this.renderFolderTree(nodes);
            });

            // Render children
            node.children.forEach(child => renderNode(child));
        };

        nodes.forEach(node => renderNode(node));
    }

    private isFolderExcluded(folderPath: string): boolean {
        // Check if this folder is directly excluded
        if (this.excludedFolders.has(folderPath)) {
            return true;
        }

        // Check if any parent folder is excluded
        const parts = folderPath.split('/');
        for (let i = parts.length - 1; i > 0; i--) {
            const parentPath = parts.slice(0, i).join('/');
            if (this.excludedFolders.has(parentPath)) {
                return true;
            }
        }

        return false;
    }

    private toggleFolder(folderPath: string) {
        if (this.excludedFolders.has(folderPath)) {
            this.excludedFolders.delete(folderPath);
        } else {
            this.excludedFolders.add(folderPath);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
