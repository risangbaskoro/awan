import { Menu, Notice, Plugin, setIcon, setTooltip, moment } from 'obsidian';
import { AwanSettings, AwanSettingTab, SelectiveSyncSettings, VaultSettings } from './settings';
import { S3ConfigSchema, SyncStatus } from './types';
import { DEFAULT_S3_CONFIG, S3Filesystem } from './filesystems/s3';
import sync from './commands/sync';

/** The default vault sync settings. */
const DEFAULT_VAULT_SETTINGS: VaultSettings = {
	main: true,
	appearance: true,
	themes: true,
	hotkeys: true,
	activeCorePlugins: true,
	corePluginSettings: true,
	activeCommunityPlugins: true,
	communityPluginSettings: true
}

/** The default selective sync settings. */
const DEFAULT_SELECTIVE_SYNC_SETTINGS: SelectiveSyncSettings = {
	excludedFolders: [],
	imageFiles: false,
	audioFiles: false,
	videoFiles: false,
	pdfFiles: false,
	otherFiles: false
}

/** The default Awan plugin settings. */
const DEFAULT_AWAN_SETTINGS: Partial<AwanSettings> = {
	password: '',
	syncInterval: 5 * 60000,
	serviceType: 's3',
	vaultSettings: DEFAULT_VAULT_SETTINGS,
	selectiveSync: DEFAULT_SELECTIVE_SYNC_SETTINGS,
	s3: DEFAULT_S3_CONFIG,
}

/** Awan plugin main class. */
export default class Awan extends Plugin {
	settings!: AwanSettings;
	status!: SyncStatus;
	isSyncing!: boolean;
	lastSynced: number;
	statusBarElement!: HTMLElement;
	statusBarIcon!: HTMLSpanElement;

	/** Setup when the plugin loads. */
	async onload() {
		console.debug(`${this.manifest.id}: Initializing...`);
		await this.loadSettings();

		this.registerCommands();
		this.addSettingTab(new AwanSettingTab(this.app, this));

		this.updateStatus();
		this.registerStatusBar();
		await this.markIsSyncing(false);

		console.debug(`${this.manifest.id} ${this.manifest.version} is loaded.`);
	}

	/** Teardown when the plugin unloads. */
	onunload() {
	}

	registerCommands() {
		this.addCommand({
			id: 'sync',
			name: 'Sync',
			callback: async () => {
				await sync(this);
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

	registerStatusBar() {
		this.statusBarElement = this.addStatusBarItem();
		this.statusBarElement.addClass('mod-clickable');
		const segment = this.statusBarElement.createEl('div', { cls: ['status-bar-item-segment'] })
		this.statusBarIcon = segment.createEl('span', { cls: ['status-bar-item-icon', 'awan-status-icon'] })

		// Register status bar menu on click.
		this.statusBarElement.onClickEvent((ev: MouseEvent) => {
			const menu = new Menu();
			menu.addItem(item => item
				.setDisabled(this.isSyncing)
				.setTitle(`Awan Sync: ${this.status}`)
				.onClick(async () => {
					await sync(this);
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

	updateStatusBar() {
		setTooltip(this.statusBarElement, this.status, { placement: "top" });
		if (this.isSyncing) {
			setIcon(this.statusBarIcon, 'refresh-cw');
		} else {
			setIcon(this.statusBarIcon, 'cloud-check');
		}
		this.statusBarIcon.toggleClass('animate-spin', this.isSyncing);
	}

	async markIsSyncing(isSyncing: boolean) {
		this.isSyncing = isSyncing;
		this.updateStatusBar();
	}

	updateLastSynced() {
		this.lastSynced = moment.now()
	}

	async testConnection() {
		// TODO: Move the manager to the class property.

		// TODO: Check if every required settings in a client exists.

		const client = new S3Filesystem(this.app, this.settings.s3);
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
			default: schema = S3ConfigSchema;
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

