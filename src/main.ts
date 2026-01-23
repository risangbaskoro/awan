import { Menu, Notice, Plugin, setIcon, setTooltip } from 'obsidian';
import { DEFAULT_SETTINGS, AwanSettings, AwanSettingTab } from './settings';
import { S3FileSystem } from 'fsS3';

export default class Awan extends Plugin {
	settings!: AwanSettings;
	isSyncing!: boolean;
	lastSynced: number;
	statusBarElement!: HTMLElement;
	statusBarIcon!: HTMLSpanElement;

	async onload() {
		console.debug(`${this.manifest.id}: Initializing...`);
		await this.loadSettings();

		this.registerCommands();
		this.addSettingTab(new AwanSettingTab(this.app, this));
		this.configureStatusBar();

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

	configureStatusBar() {
		if (!this.statusBarElement) {
			this.statusBarElement = this.addStatusBarItem();
			this.statusBarElement.addClass('mod-clickable')
			const segment = this.statusBarElement.createEl('div', { cls: ['status-bar-item-segment'] })
			this.statusBarIcon = segment.createEl('span', { cls: ['status-bar-item-icon', 'sync-status-icon', 'mod-success'] })

			// Register status bar menu on click.
			this.statusBarElement.onClickEvent((ev: MouseEvent) => {
				const menu = new Menu();
				menu.addItem(item => item
					.setTitle('Sync')
					.onClick(async () => {
						const testingNotice = new Notice('Testing connection.', 0);
						await this.markIsSyncing(true);

						const client = new S3FileSystem(this.app, this.settings.s3);
						console.debug(client.getS3Client());
						let result = await client.testConnection();

						testingNotice.hide();
						if (result) {
							new Notice("Success", 5000);
						} else {
							new Notice("Failed!", 8000);
						}
						await this.markIsSyncing(false);
					})
				);
				menu.addSeparator();
				menu.addItem(item => item
					.setTitle('Settings')
					.onClick(() => {
						// Open the plugin settings tab using the app's internal API
						// @ts-ignore
						this.app.setting.open(); // eslint-disable-line
						// @ts-ignore
						this.app.setting.openTabById(this.manifest.id); // eslint-disable-line
					})
				);
				menu.showAtMouseEvent(ev);
			})
		}
		setTooltip(this.statusBarElement, `Sync`, { placement: "top" });
		setIcon(this.statusBarIcon, 'cloud-check');
	}

	async markIsSyncing(isSyncing: boolean) {
		this.isSyncing = isSyncing;

		if (isSyncing) {
			setIcon(this.statusBarElement, 'cloud')
		} else {
			setIcon(this.statusBarElement, 'cloud-check');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as AwanSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

