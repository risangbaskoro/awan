import { Menu, Notice, Plugin, setIcon, setTooltip, moment } from 'obsidian';
import { AwanSettings, AwanSettingTab } from './settings';
import { S3ConfigSchema, SyncStatus, WebDAVConfigSchema } from 'types';
import { DEFAULT_S3_CONFIG, S3FileSystem } from 'filesystems/s3';
import { DEFAULT_WEBDAV_CONFIG } from 'filesystems/webdav';

export const DEFAULT_AWAN_SETTINGS: Partial<AwanSettings> = {
	password: '',
	syncInterval: 5 * 60000,
	serviceType: 's3',
	s3: DEFAULT_S3_CONFIG,
	webdav: DEFAULT_WEBDAV_CONFIG
}

export default class Awan extends Plugin {
	settings!: AwanSettings;
	status!: SyncStatus;
	isSyncing!: boolean;
	lastSynced: number;
	statusBarElement!: HTMLElement;
	statusBarIcon!: HTMLSpanElement;

	async onload() {
		console.debug(`${this.manifest.id}: Initializing...`);
		await this.loadSettings();

		this.registerCommands();
		this.addSettingTab(new AwanSettingTab(this.app, this));

		this.updateStatus();
		this.updateStatusBar();

		console.debug(`${this.manifest.id} ${this.manifest.version} is loaded.`);
	}

	onunload() {
	}

	async runSync() {
		let notice = new Notice('Syncing files.', 0);
		await this.markIsSyncing(true);

		try {
			// TODO: Syncing process.
			const client = new S3FileSystem(this.app, this.settings.s3);
			await client.testConnection();

			this.updateLastSynced();
			this.updateStatus(SyncStatus.SUCCESS);
			new Notice(`Successfully synced files.`)
		} catch (err) {
			// TODO: Catch error.
			new Notice(`Failed to sync. ${err as string}`);
			this.updateStatus(SyncStatus.ERROR);
		} finally {
			notice.hide();
			await this.markIsSyncing(false);
			this.updateStatusBar();
		}
	}

	registerCommands() {
		this.addCommand({
			id: 'sync',
			name: 'Sync',
			callback: async () => {
				await this.runSync();
			}
		});

		this.addCommand({
			id: 'sync-dry-run',
			name: 'Sync (dry run)',
			callback: async () => {
				new Notice('Syncing files (dry run).');
			}
		})
	}

	updateStatusBar() {
		if (!this.statusBarElement) {
			this.statusBarElement = this.addStatusBarItem();
			this.statusBarElement.addClass('mod-clickable')
			const segment = this.statusBarElement.createEl('div', { cls: ['status-bar-item-segment'] })
			this.statusBarIcon = segment.createEl('span', { cls: ['status-bar-item-icon', 'sync-status-icon', 'mod-success'] })

			// Register status bar menu on click.
			this.statusBarElement.onClickEvent((ev: MouseEvent) => {
				const menu = new Menu();
				menu.addItem(item => item
					.setTitle(`Awan Sync: ${this.status}`)
					.onClick(async () => {
						await this.runSync();
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

		setTooltip(this.statusBarElement, this.status, { placement: "top" });
		setIcon(this.statusBarIcon, 'cloud-check');

		if (this.isSyncing) {
			setIcon(this.statusBarIcon, 'iteration-cw');
		} else {
			setIcon(this.statusBarIcon, 'cloud-check');
		}

		this.statusBarIcon.toggleClass('animate-spin', this.isSyncing)
	}

	async markIsSyncing(isSyncing: boolean) {
		this.isSyncing = isSyncing;

		if (isSyncing) {
			setIcon(this.statusBarElement, 'cloud')
		} else {
			setIcon(this.statusBarElement, 'cloud-check');
		}
	}

	updateLastSynced() {
		this.lastSynced = moment.now()
	}

	async testConnection() {
		// TODO: Move the manager to the class property.

		// TODO: Check if every required settings in a client exists.

		const client = new S3FileSystem(this.app, this.settings.s3);
		const notice = new Notice("Testing connection.", 0);

		try {
			const result = await client.testConnection();
			if (!result) {
				throw Error(`Whoops`);
			}

			new Notice('Connected to remote.')
		} catch (err) {
			new Notice(`Failed to connect to remote. Check your settings or internet connection.`);
			new Notice(err as string);
		} finally {
			notice.hide();
		}
	}

	updateStatus(status?: SyncStatus) {
		// Set status if defined.
		if (status) {
			this.status = status;
			return;
		}

		// Check if initialized.
		const serviceType = this.settings.serviceType;
		const serviceSettings = this.settings[serviceType];

		let schema;
		switch (serviceType) {
			case 's3': schema = S3ConfigSchema;
				break;
			case 'webdav': schema = WebDAVConfigSchema;
				break;
		}

		if (!(schema.safeParse(serviceSettings).success)) {
			this.updateStatus(SyncStatus.UNINITIALIZED);
		} else {
			this.updateStatus(SyncStatus.IDLE);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_AWAN_SETTINGS, await this.loadData() as AwanSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStatus();
	}
}

