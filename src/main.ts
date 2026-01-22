import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, AwanSettings, AwanSettingTab } from './settings';

export default class Awan extends Plugin {
	settings!: AwanSettings;
	isSyncing!: boolean;

	async onload() {
		console.debug(`${this.manifest.id}: Initializing...`);
		await this.loadSettings();

		const statusBar = this.addStatusBarItem();
		statusBar.setText('Awan');

		this.registerCommands();

		this.addSettingTab(new AwanSettingTab(this.app, this));

		console.debug(`${this.manifest.id}: v${this.manifest.version} is loaded.`);
	}

	onunload() {
	}

	registerCommands() {
		this.addCommand({
			id: 'sync',
			name: 'Sync',
			callback: async () => {
				new Notice('Syncing files.');
			}
		});

		this.addCommand({
			id: 'sync-dry-run',
			name: 'Sync (dry run)',
			callback: () => {
				new Notice('Syncing files (dry run).');
			}
		})
	}

	async markIsSyncing(isSyncing: boolean) {
		this.isSyncing = isSyncing;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as AwanSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

