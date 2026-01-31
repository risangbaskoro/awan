import { Menu, Plugin, setIcon, setTooltip, moment, TAbstractFile } from 'obsidian';
import { AwanSettings, AwanSettingTab, SelectiveSyncSettings, VaultSyncSettings } from './settings';
import { S3ConfigSchema, SyncStatus } from './types';
import { DEFAULT_S3_CONFIG } from './filesystems/s3';
import sync from './commands/sync';
import { Database } from './database';
import testConnection from './commands/testConnection';

/** The default vault sync settings. */
const DEFAULT_VAULT_SETTINGS: VaultSyncSettings = {
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
	scheduledSync: {
		enabled: false,
		interval: 5 * 60000,
	},
	serviceType: 's3',
	vaultSyncSettings: DEFAULT_VAULT_SETTINGS,
	selectiveSync: DEFAULT_SELECTIVE_SYNC_SETTINGS,
	s3: DEFAULT_S3_CONFIG,
}

/** 
 * Awan plugin main class. 
 */
export default class Awan extends Plugin {
	settings!: AwanSettings;
	database!: Database;
	status!: SyncStatus;
	isSyncing!: boolean;
	lastSynced: number;
	statusBarElement: HTMLElement;
	statusBarIcon: HTMLSpanElement;

	/** 
	 * Setup when the plugin loads.
	 */
	async onload() {
		if (!Awan.isProduction()) console.debug(`${this.manifest.id}: Initializing...`);
		await this.loadSettings();

		this.database = new Database(this.app);

		this.registerCommands();
		this.registerStatusBar();

		this.addSettingTab(new AwanSettingTab(this.app, this));
		this.updateStatus();

		// Updates the status whenever a file is created, modified, renamed, or deleted.
		const fileEventCallback = (_file: TAbstractFile) => {
			if (this.status === SyncStatus.ERROR) return;
			this.updateStatus();
		};
		this.registerEvent(this.app.vault.on('create', fileEventCallback));
		this.registerEvent(this.app.vault.on('modify', fileEventCallback));
		this.registerEvent(this.app.vault.on('rename', fileEventCallback));
		this.registerEvent(this.app.vault.on('delete', fileEventCallback));

		if (!Awan.isProduction()) console.debug(`${this.manifest.id} ${this.manifest.version} is loaded.`);
	}

	/** 
	 * Teardown when the plugin unloads. 
	 */
	onunload() {
	}

	/**
	 * Register commands of the plugin.
	 * 
	 * @private
	 */
	private registerCommands() {
		this.addCommand({
			id: `sync`,
			name: `Sync`,
			checkCallback: (checking: boolean) => {
				if (this.validateServiceSettings()) {
					if (!checking) void sync(this);
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: `test-connection`,
			name: `Test connection`,
			checkCallback: (checking: boolean) => {
				if (this.validateServiceSettings()) {
					if (!checking) void testConnection(this);
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: `setup`,
			name: `Set up remote sync`,
			checkCallback: (checking: boolean) => {
				if (!(this.validateServiceSettings())) {
					if (!checking) this.openSettingsTab();
					return true;
				}
				return false;
			}
		});
	}

	/**
	 * Register statusbar elemnt if not exists.
	 * 
	 * @private
	 */
	private registerStatusBar() {
		if (this.statusBarElement && this.statusBarIcon) return;

		this.statusBarElement = this.addStatusBarItem();
		this.statusBarElement.addClass('mod-clickable');
		const segment = this.statusBarElement.createEl('div', { cls: ['status-bar-item-segment'] });
		this.statusBarIcon = segment.createEl('span', { cls: ['status-bar-item-icon', 'awan-status-icon'] });

		// Register status bar menu on click.
		this.statusBarElement.onClickEvent((ev: MouseEvent) => {
			const menu = new Menu();
			menu.addItem(item => item
				.setDisabled(this.isSyncing || this.status === SyncStatus.UNINITIALIZED)
				.setTitle(`${this.manifest.name}: ${this.status}`)
				.onClick(() => sync(this))
			);
			menu.addSeparator();
			menu.addItem(item => item
				.setTitle('Settings')
				.onClick(() => this.openSettingsTab())
			);
			menu.showAtMouseEvent(ev);
		});
	}

	/**
	 * Mark the plugin as currently syncing.
	 */
	private markIsSyncing(isSyncing: boolean) {
		this.isSyncing = isSyncing;
	}

	/**
	 * Update the plugin status.
	 * 
	 * @param status The status of the plugin.
	 */
	updateStatus(status?: SyncStatus) {
		// Set status if defined.
		if (status) {
			this.status = status;
			switch (status) {
				case SyncStatus.UNINITIALIZED:
					this.markIsSyncing(false);
					break;
				case SyncStatus.UNVALIDATED:
					this.markIsSyncing(false);
					break;
				case SyncStatus.IDLE:
					this.markIsSyncing(false);
					break;
				case SyncStatus.SYNCING:
					this.markIsSyncing(true);
					break;
				case SyncStatus.SUCCESS:
					this.markIsSyncing(false);
					this.lastSynced = moment.now();
					break;
				case SyncStatus.ERROR:
					this.markIsSyncing(false);
					break;
				default:
					break;
			}
			this.updateStatusBar();
			return;
		}

		// Check if the remote config is valid.
		if (!this.validateServiceSettings()) {
			this.updateStatus(SyncStatus.UNINITIALIZED);
			return;
		}

		// Check if the remote config is not yet validated.
		if ([SyncStatus.UNINITIALIZED, SyncStatus.UNVALIDATED].contains(this.status)) {
			this.updateStatus(SyncStatus.UNVALIDATED);
			return;
		}

		this.updateStatus(SyncStatus.IDLE);
	}

	/**
	 * Update status bar.
	 * 
	 * This function optionally register status bar if not exists.
	 */
	updateStatusBar() {
		setTooltip(this.statusBarElement, this.status, { placement: "top" });
		switch (this.status) {
			case SyncStatus.UNINITIALIZED:
				setIcon(this.statusBarIcon, 'cloud-off');
				this.setStatusBarIconColor('warning');
				break;
			case SyncStatus.UNVALIDATED:
				setIcon(this.statusBarIcon, 'cloud-cog');
				this.setStatusBarIconColor();
				break;
			case SyncStatus.IDLE:
				setIcon(this.statusBarIcon, 'cloud');
				this.setStatusBarIconColor();
				break;
			case SyncStatus.SYNCING:
				setIcon(this.statusBarIcon, 'refresh-cw');
				this.setStatusBarIconColor();
				break;
			case SyncStatus.SUCCESS:
				setIcon(this.statusBarIcon, 'cloud-check');
				this.setStatusBarIconColor('success');
				break;
			case SyncStatus.ERROR:
				setIcon(this.statusBarIcon, 'cloud-alert');
				this.setStatusBarIconColor('warning');
				break;
			default:
				break;
		}

		this.statusBarIcon.toggleClass('animate-spin', this.status === SyncStatus.SYNCING);
	}

	/**
	 * Set the status bar icon color by adding or removing mod classes.
	 * 
	 * @param color The color to be used. If omitted, reset the color to default.
	 */
	private setStatusBarIconColor(color?: 'default' | 'success' | 'warning') {
		switch (color) {
			case 'success':
				this.statusBarIcon.removeClass('mod-warning');
				this.statusBarIcon.addClass('mod-success');
				break;
			case 'warning':
				this.statusBarIcon.removeClass('mod-success');
				this.statusBarIcon.addClass('mod-warning');
				break;
			case 'default':
				this.statusBarIcon.removeClasses(['mod-success', 'mod-warning']);
				break;
			default:
				this.statusBarIcon.removeClasses(['mod-success', 'mod-warning']);
				break;
		}
	}

	/**
	 * Open settings tab in Obsidian.
	 * 
	 * This function calls the inner app setting object,
	 * then open setting tab by ID of this plugin.
	 */
	openSettingsTab() {
		// Open the plugin settings tab using the app's internal API
		// @ts-ignore
		this.app.setting.open(); // eslint-disable-line
		// @ts-ignore
		this.app.setting.openTabById(this.manifest.id); // eslint-disable-line
	}

	/**
	 * Check the validity of the service settings.
	 * 
	 * @returns True if the settings are valid.
	 */
	validateServiceSettings(): boolean {
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

		return schema.safeParse(serviceSettings).success
	}

	/**
	 * Load settings from plugin's `data.json` file.
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_AWAN_SETTINGS, await this.loadData() as AwanSettings);
	}

	/**
	 * Save settings to plugin's `data.json` file.
	 */
	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStatus();
	}

	/**
	 * Return string representation of the current environment.
	 */
	static environment(): string {
		return process.env.NODE_ENV as string; // eslint-disable-line
	}

	/**
	 * Determine if the plugin is in production mode.
	 */
	static isProduction(): boolean {
		return this.environment() === "production";
	}

	/**
	 * Determine if the plugin is in development mode.
	 */
	static isDevelopment(): boolean {
		return !this.isProduction();
	}
}

