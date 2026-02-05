import { Menu, Plugin, setIcon, setTooltip, moment, TAbstractFile, Notice, ObsidianProtocolData, IconName, Platform, WorkspaceMobileDrawer, WorkspaceItem } from 'obsidian';
import { AwanSettingTab, } from './settings';
import { AwanLocalSettings, AwanSettings, SelectiveSyncSettings, VaultSyncSettings } from './types';
import { S3ConfigSchema, SyncStatus } from './types';
import { DEFAULT_S3_CONFIG } from './filesystems/s3';
import sync from './commands/sync';
import { Database } from './database';
import testConnection from './commands/testConnection';
import { LAST_SYNCED_KEY } from 'utils/constants';

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
	serviceType: 's3',
	vaultSyncSettings: DEFAULT_VAULT_SETTINGS,
	selectiveSync: DEFAULT_SELECTIVE_SYNC_SETTINGS,
	s3: DEFAULT_S3_CONFIG,
}

/** The default Awan local settings from local storage. */
const DEFAULT_AWAN_LOCAL_SETTINGS: Partial<AwanLocalSettings> = {
	enabled: true,
	syncIntervalMs: 5 * 60000,
}

/** 
 * Awan plugin main class. 
 */
export default class Awan extends Plugin {
	settings!: AwanSettings;
	localSettings!: AwanLocalSettings;

	database!: Database;

	private statusBarEl: HTMLElement;
	private statusIconEl: HTMLElement;

	private lastSynced: number;
	private syncStatus: SyncStatus = SyncStatus.IDLE;
	private syncing: boolean = false;
	private syncIntervalId: number | undefined;

	/** 
	 * Setup when the plugin loads.
	 */
	async onload() {
		await this.loadSettings();
		this.loadLocalSettings();
		this.saveLocalSettings();
		this.lastSynced = this.app.loadLocalStorage(LAST_SYNCED_KEY) as number;

		this.database = new Database(this.app);

		this.registerCommands();
		this.addSettingTab(new AwanSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(async () => {
			this.registerStatusBar();
			this.updateStatus();
			this.registerEvents();
			await this.updateAutoSync();
		});

		// TODO: Register protocol handler for importing config.
		this.registerObsidianProtocolHandler(this.manifest.id, (data: ObsidianProtocolData) => this.onUriCall(data));
	}

	/** 
	 * Teardown when the plugin unloads. 
	 */
	onunload() {
		if (this.syncIntervalId !== undefined) {
			window.clearInterval(this.syncIntervalId);
		}

		if (this.statusIconEl !== undefined) this.statusIconEl.remove();
	}

	async onExternalSettingsChange() {
		await this.loadSettings();
		new Notice(`${this.manifest.name} settings has been modified externally. Settings has been reloaded.`);
	}

	async updateAutoSync() {
		const { enabled, syncIntervalMs } = this.localSettings;

		if (this.syncIntervalId !== undefined) {
			window.clearInterval(this.syncIntervalId);
			this.syncIntervalId = undefined;
		}

		if (enabled) {
			this.syncIntervalId = window.setInterval(() => {
				sync(this).catch((err) => {
					console.error(`${this.manifest.id}: Sync failed.`, err);
				});
			}, syncIntervalMs);
		}
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
					if (!checking) {
						sync(this)
							.catch(err => console.error(err));
					};
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: `test`,
			name: `Test connection`,
			checkCallback: (checking: boolean) => {
				if (this.validateServiceSettings()) {
					if (!checking) {
						testConnection(this)
							.catch(err => console.error(err));
					}
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: `setup`,
			name: `Set up sync`,
			checkCallback: (checking: boolean) => {
				if (this.validateServiceSettings()) return false;
				if (!checking) this.openSettingsTab();
				return true;
			}
		});
	}

	/**
	 * Register file events for this plugin
	 */
	private registerEvents() {
		// Updates the status whenever a file is created, modified, renamed, or deleted.
		const updateStatusCallback = () => {
			if (this.syncStatus === SyncStatus.SYNCING) return;
			if (this.syncStatus === SyncStatus.ERROR) return;
			this.updateStatus();
		};

		this.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => {
			updateStatusCallback();
		}));
		this.registerEvent(this.app.vault.on('modify', (file: TAbstractFile) => {
			updateStatusCallback();
		}));
		this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, _oldPath: string) => {
			updateStatusCallback();
		}));
		this.registerEvent(this.app.vault.on('delete', (file: TAbstractFile) => {
			updateStatusCallback();
		}));
	}

	/**
	 * Register statusbar elemnt if not exists.
	 * 
	 * @private
	 */
	private registerStatusBar() {
		if (this.statusIconEl) return;

		const clickEvent = (ev: MouseEvent) => {
			const menu = new Menu();
			menu.setUseNativeMenu(Awan.isProduction()); // NOTE: Temporary until mobile status bar.

			menu.addItem(item => {
				return item
					.setIsLabel(true)
					.setSection('status')
					.setTitle(`${this.manifest.name}: ${this.getCurrentStatusText()}`);
			});

			menu.addSeparator();

			if (this.syncStatus !== SyncStatus.UNINITIALIZED) {
				menu.addItem(item => item
					.setTitle(this.localSettings.enabled ? 'Pause' : 'Resume')
					.setIcon(this.localSettings.enabled ? 'circle-pause' : 'circle-play')
					.setSection('action')
					.onClick(async () => {
						this.localSettings.enabled = !this.localSettings.enabled;
						this.saveLocalSettings();
					})
				)
			}

			menu.addSeparator();
			menu.addItem(item => item
				.setTitle('Settings')
				.setIcon('settings')
				.onClick(() => this.openSettingsTab())
			);
			menu.showAtMouseEvent(ev);
		};

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('mod-clickable');

		if (Platform.isMobileApp || Platform.isMobile) {
			// Create custom status icon like for mobile.
			const rightSplit = this.app.workspace.rightSplit as WorkspaceMobileDrawer;
			const root = rightSplit.getRoot() as WorkspaceItem & { headerEl?: HTMLElement };
			const headerEl = root?.headerEl;

			if (root && root?.headerEl) {
				// Check if status icon already exists.
				const existingIcon = headerEl?.querySelector('.awan-status-icon');
				if (existingIcon) {
					existingIcon.remove();
				};

				this.statusIconEl = root.headerEl.createEl('div', {
					cls: ['clickable-icon', 'workspace-drawer-header-icon', 'mod-raised', 'awan-status-icon']
				});
				setIcon(this.statusIconEl, this.getCurrentStatusIcon());
			}
		} else {
			this.statusIconEl = this.statusBarEl.createEl('div', { cls: ['status-bar-item-segment'] })
				.createEl('span', { cls: ['status-bar-item-icon', 'awan-status-icon'] });
		}
		this.statusIconEl.onClickEvent((ev: MouseEvent) => clickEvent(ev));
	}

	/**
	 * Mark the plugin as currently syncing.
	 */
	private markIsSyncing(isSyncing: boolean) {
		this.syncing = isSyncing;
	}

	/**
	 * Update the plugin status.
	 * 
	 * @param status The status of the plugin.
	 */
	updateStatus(status?: SyncStatus) {
		// Set status if defined.
		if (status) {
			this.syncStatus = status;
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
					this.app.saveLocalStorage(LAST_SYNCED_KEY, this.lastSynced);
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
		if ([SyncStatus.UNINITIALIZED, SyncStatus.UNVALIDATED].contains(this.syncStatus)) {
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
	private updateStatusBar() {
		setTooltip(this.statusBarEl, this.syncStatus, { placement: "top" });
		setIcon(this.statusIconEl, this.getCurrentStatusIcon());

		this.statusIconEl.toggleClass('animate-spin', this.syncStatus === SyncStatus.SYNCING);
		this.setStatusBarIconColor(this.getCurrentStatusColor());
	}

	/**
	 * Get the icon string representation for the current plugin status.
	 * @returns A Lucide icon string.
	 */
	getCurrentStatusIcon(): IconName {
		switch (this.syncStatus) {
			case SyncStatus.UNINITIALIZED: return 'cloud-off';
			case SyncStatus.IDLE: return 'cloud';
			case SyncStatus.SYNCING: return 'refresh-cw';
			case SyncStatus.SUCCESS: return 'cloud-check';
			case SyncStatus.ERROR: return 'cloud-alert';
			default: return 'cloud';
		}
	}

	/**
	 * Get the color string representation for the current plugin status.
	 * @returns A color string, used in conjunction with `mod-<color>` class.
	 */
	getCurrentStatusColor(): 'default' | 'accent' | 'success' | 'warning' | 'error' {
		switch (this.syncStatus) {
			case SyncStatus.UNINITIALIZED: return 'error';
			case SyncStatus.SUCCESS: return 'success';
			case SyncStatus.ERROR: return 'error';
			case SyncStatus.SYNCING: return 'accent';
			default: return 'accent';
		}
	}

	/** Get status text for sync process. */
	getCurrentStatusText(): string {
		return !this.lastSynced ? 'Never synced' : moment(this.lastSynced).fromNow().toLocaleLowerCase();
	}

	/**
	 * Set the status bar icon color by adding or removing mod classes.
	 * 
	 * @param color The color to be used. If omitted, reset the color to default.
	 */
	private setStatusBarIconColor(color?: 'default' | 'accent' | 'success' | 'warning' | 'error') {
		switch (color) {
			case 'accent':
				this.statusIconEl.removeClasses(['mod-success', 'mod-warning', 'mod-error']);
				this.statusIconEl.addClass('mod-accent');
				break;
			case 'success':
				this.statusIconEl.removeClasses(['mod-warning', 'mod-accent', 'mod-error']);
				this.statusIconEl.addClass('mod-success');
				break;
			case 'warning':
				this.statusIconEl.removeClasses(['mod-success', 'mod-accent', 'mod-error']);
				this.statusIconEl.addClass('mod-warning');
				break;
			case 'error':
				this.statusIconEl.removeClasses(['mod-success', 'mod-accent', 'mod-warning']);
				this.statusIconEl.addClass('mod-error');
				break;
			default:
				this.statusIconEl.removeClasses(['mod-success', 'mod-warning', 'mod-accent', 'mod-error']);
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

	private onUriCall(data: ObsidianProtocolData) {
		// The protocol data should contains `import` query string
		// or ObsidianProtocolData
		// Example URL
		// {
		// 	"action": "awan"
		// 	"import": "xxx",
		// 	"X-Amz-Credential": "xxx",
		// 	"X-Amz-Date": "xxx",
		// 	"X-Amz-Expires": "xxx",
		// 	"X-Amz-SignedHeaders": "xxx",
		// 	"X-Amz-Signature": "xxx",
		// }
		console.debug(JSON.stringify(data['import']));
	}

	/**
	 * Load settings from plugin's `data.json` file.
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_AWAN_SETTINGS, await this.loadData() as AwanSettings);
	}

	/**
	 * Load local settings from local storage.
	 */
	loadLocalSettings() {
		this.localSettings = Object.assign(
			{},
			DEFAULT_AWAN_LOCAL_SETTINGS,
			this.app.loadLocalStorage(`${this.manifest.id}-settings`)
		) as AwanLocalSettings;
	}

	/**
	 * Save settings to plugin's `data.json` file.
	 */
	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStatus();
	}

	saveLocalSettings() {
		this.app.saveLocalStorage(`${this.manifest.id}-settings`, this.localSettings)
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

