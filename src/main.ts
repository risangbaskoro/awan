import { debounce, FileStats, Menu, moment, Platform, Plugin, setIcon, setTooltip, TAbstractFile, TFile, TFolder, WorkspaceItem, WorkspaceMobileDrawer } from 'obsidian';
import { AwanSettings, ConflictAction, Entity, FileType, SelectiveSyncSettings, SyncStatus, VaultSyncSettings } from './types';
import { DEFAULT_S3_CONFIG } from './filesystems/s3';
import { Database } from './database';
import { AwanSettingTab } from 'settings';
import sync from 'commands/sync';
import testConnection from 'commands/testConnection';
import { validateServiceSettings, getIconByStatus, setColor, getColorByStatus, toSentenceCase } from './utils/functions';


/** Local storage key for pause state. */
const PAUSED_KEY = 'awan-paused';

/** Local storage key for interval timer in milliseconds. */
const SYNC_INTERVAL_KEY = 'awan-sync-interval';

/** Local storage key for last synced timestamp. */
const LAST_SYNCED_KEY = 'awan-last-synced';

/** Local storage key for allowed file types. */
const ALLOW_TYPES_KEY = 'awan-allow-types';

/** Conflict action to use when conflict occurs. */
const CONFLICT_ACTION_KEY = 'awan-conflict-action'

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
	serviceType: 's3',
	concurrency: 5,
	conflictAction: 'merge',
	vaultSyncSettings: DEFAULT_VAULT_SETTINGS,
	selectiveSync: DEFAULT_SELECTIVE_SYNC_SETTINGS,
	s3: DEFAULT_S3_CONFIG,
}

/** 
 * Awan plugin main class. 
 */
export default class Awan extends Plugin {
	settings: AwanSettings;
	database: Database;

	private statusBarEl: HTMLElement;
	private statusIconEl: HTMLElement;

	private allowSpecialFiles: Set<string>; // TODO: Change `T` type of `Set<T>`. Create a new type.
	private allowTypes: Set<FileType>;

	private conflictAction: ConflictAction;

	private localFiles: Record<string, Entity>;

	private pause: boolean;
	syncing: boolean = false;
	private syncStatus: SyncStatus = SyncStatus.IDLE;
	private syncIntervalId: number | undefined;
	private syncIntervalMs: number | null = null;
	private lastSynced: number | undefined;

	/** 
	 * Setup when the plugin loads.
	 */
	async onload() {
		// Load settings.
		await this.loadSettings();
		this.database = new Database(this.app);
		this.pause = this.getPause();
		this.syncIntervalMs = this.getSyncInterval();
		this.lastSynced = this.app.loadLocalStorage(LAST_SYNCED_KEY) as number | undefined;

		this.allowTypes = new Set(
			this.app.loadLocalStorage(ALLOW_TYPES_KEY) as FileType[]
			?? ['image', 'audio', 'video', 'pdf']
		);

		this.conflictAction = this.app.loadLocalStorage(CONFLICT_ACTION_KEY) as ConflictAction ?? 'create_conflict_file';

		this.localFiles = {};
		await this.database.localFiles.iterate((value: Entity, key: string) => this.localFiles[key] = value);

		this.addSettingTab(new AwanSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(async () => {
			// Register commands.
			this.registerCommands();
			// Register status bar.
			this._registerStatusBarItem();
			// Register events for files.
			this.registerEvents();
			// Initiate the sync interval.
			this.updateSyncInterval(this.syncIntervalMs);
		});
	}

	/** 
	 * Teardown when the plugin unloads. 
	 */
	onunload() {
		// Remove status icon for mobile.
		if (this.statusIconEl !== undefined) this.statusIconEl.remove();

		// Clear sync interval ID if any.
		window.clearInterval(this.syncIntervalId);
	}

	/**
	 * Update the plugin's sync status.
	 * 
	 * If undefined, the plugin will determine
	 * between Unintialized, Unvalidated, or Idle
	 * based on the configuration file.
	 * 
	 * @param status The sync status.
	 */
	setStatus(status?: SyncStatus) {
		// Set status if defined.
		if (status) {
			this.syncStatus = status;
			switch (status) {
				case SyncStatus.UNINITIALIZED:
					this.syncing = false;
					break;
				case SyncStatus.UNVALIDATED:
					this.syncing = false;
					break;
				case SyncStatus.IDLE:
					this.syncing = false;
					break;
				case SyncStatus.SYNCING:
					this.syncing = true;
					break;
				case SyncStatus.SUCCESS:
					this.syncing = false;
					this.lastSynced = moment.now();
					this.app.saveLocalStorage(LAST_SYNCED_KEY, this.lastSynced);
					break;
				case SyncStatus.ERROR:
					this.syncing = false;
					break;
				default:
					break;
			}
			this._updateStatusBar();
			return;
		}

		// Check if the remote config is valid.
		if (!validateServiceSettings(this.settings)) {
			this.setStatus(SyncStatus.UNINITIALIZED);
			return;
		}

		// Check if the remote config is not yet validated.
		if ([SyncStatus.UNINITIALIZED, SyncStatus.UNVALIDATED].contains(this.syncStatus)) {
			this.setStatus(SyncStatus.UNVALIDATED);
			return;
		}

		this.setStatus(SyncStatus.IDLE);
	}

	/**
	 * Get the plugin's sync status.
	 */
	getStatus(): SyncStatus {
		return this.syncStatus;
	}

	/**
	 * Get the plugin's sync status as text.
	 */
	getStatusText(): string {
		if (!this.syncStatus && [
			SyncStatus.UNINITIALIZED,
			SyncStatus.UNVALIDATED
		].contains(this.syncStatus)) {
			return this.syncStatus;
		}

		return !this.lastSynced ? 'never synced' : moment(this.lastSynced).fromNow();
	}

	/**
	 * Set the conflict action.
	 */
	setConflictAction(conflictAction: ConflictAction) {
		this.conflictAction = conflictAction;
		this.app.saveLocalStorage(CONFLICT_ACTION_KEY, conflictAction);
	}

	/**
	 * Get the conflict action.
	 */
	getConflictAction(): ConflictAction {
		return this.conflictAction ?? this.app.loadLocalStorage(CONFLICT_ACTION_KEY);
	}

	/**
	 * Open the plugin settings.
	 * 
	 * This method calls the inner app setting object,
	 * then open setting tab by ID of this plugin.
	 */
	openSettings() {
		// Open the plugin settings tab using the app's internal API
		// @ts-ignore
		this.app.setting.open(); // eslint-disable-line
		// @ts-ignore
		this.app.setting.openTabById(this.manifest.id); // eslint-disable-line
	}

	/**
	 * Open the menu for status icon.
	 */
	openStatusIconMenu(ev: MouseEvent) {
		const menu = new Menu();

		menu.addItem(item => {
			return item
				.setIsLabel(true)
				.setSection('status')
				.setTitle(`${this.manifest.name}: ${toSentenceCase(this.getStatusText())}`);
		});

		menu.addSeparator();

		if (this.syncStatus !== SyncStatus.UNINITIALIZED) {
			menu.addItem(item => item
				.setTitle(this.pause ? 'Resume' : 'Pause')
				.setIcon(this.pause ? 'circle-play' : 'circle-pause')
				.setSection('action')
				.onClick(async () => {
					this.setPause(!this.pause);
				})
			)
		}

		menu.addSeparator();
		menu.addItem(item => item
			.setTitle('Settings')
			.setIcon('settings')
			.onClick(() => this.openSettings())
		);
		menu.showAtMouseEvent(ev);
	}

	private registerCommands() {
		this.addCommand({
			id: `sync`,
			name: `Sync`,
			checkCallback: (checking: boolean) => {
				if (validateServiceSettings(this.settings)) {
					if (!checking) {
						sync(this, 'manual').catch((err) => {
							console.error(`${this.manifest.id}: Sync failed.`, err);
						});
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
				if (validateServiceSettings(this.settings)) {
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
				if (validateServiceSettings(this.settings)) return false;
				if (!checking) this.openSettings();
				return true;
			}
		});
	}

	private registerEvents() {
		this.registerEvent(this.app.vault.on('create', async (file: TAbstractFile) => await this.onFileAdd(file)));
		this.registerEvent(this.app.vault.on('delete', async (file: TAbstractFile) => await this.onFileRemove(file)));
		this.registerEvent(this.app.vault.on('rename', async (file: TAbstractFile, oldPath) => await this.onFileRename(file, oldPath)));
		this.registerEvent(this.app.vault.on('modify', async (file: TAbstractFile) => await this.onFileModify(file)));
	}

	/**
	 * Event to call on file add.
	 */
	private async onFileAdd(file: TAbstractFile) {
		let folder: boolean = false;
		let stat: FileStats = {
			ctime: 0,
			mtime: 0,
			size: 0
		};

		if (file instanceof TFile) stat = file.stat;
		else if (file instanceof TFolder) folder = true;

		const localFile = {
			key: file.path,
			...stat,
			previouspath: "",
			folder,
			hash: "",
			synchash: "",
			synctime: 0
		};
		this.localFiles[file.path] = localFile;
		await this.database.localFiles.setItem(file.path, localFile);
	}

	/**
	 * Event to call on file remove.
	 */
	private async onFileRemove(file: TAbstractFile) {
		delete this.localFiles[file.path];
		await this.database.localFiles.removeItem(file.path);
	}

	/**
	 * Event to call on file rename.
	 */
	private async onFileRename(file: TAbstractFile, previouspath: string) {
		const localFile: Entity | undefined = this.localFiles[previouspath];
		if (!localFile) return;

		delete this.localFiles[previouspath];
		await this.database.localFiles.removeItem(previouspath);
		localFile.key = file.path;
		// localFile.previouspath = previouspath;
		this.localFiles[file.path] = localFile;
		await this.database.localFiles.setItem(file.path, localFile);
	}

	/**
	 * Event to call on file modification.
	 */
	private async onFileModify(file: TAbstractFile) {
		if (file instanceof TFile) {
			const localFile = { ...this.localFiles[file.path] as Entity, ...file.stat };
			this.localFiles[file.path] = localFile;
			await this.database.localFiles.setItem(file.path, localFile);

			if ((! await this.database.snapshots.getItem(file.path)) && file.path.endsWith('.md')) {
				const content = await this.app.vault.readBinary(file);
				await this.database.snapshots.setItem(file.path, content)
			}
		}
	}

	/** 
	 * Set the plugin paused state. 
	 */
	setPause(pause: boolean) {
		this.pause = pause;
		this.app.saveLocalStorage(PAUSED_KEY, pause);
	}

	/**
	 * Get the plugin paused state.
	 */
	getPause(): boolean {
		return this.app.loadLocalStorage(PAUSED_KEY) as boolean;
	}

	/**
	 * @param timeout Timeout to set the debouncer to, in milliseconds.
	 * @returns Debounced function to call.
	 */
	requestUpdateSyncInterval(timeout: number = 2000) {
		return debounce(() => {
			this.updateSyncInterval(this.syncIntervalMs);
		}, timeout);
	}

	/**
	 * Set the interval to run auto syncing.
	 * 
	 * @param interval Sync interval, in milliseconds.
	 */
	private updateSyncInterval(interval: number | null) {
		if (this.syncIntervalId !== undefined || !interval) {
			window.clearInterval(this.syncIntervalId);
			this.syncIntervalId = undefined;
		};

		const action = () => {
			if (!this.pause) {
				sync(this, 'auto').catch((err) => {
					console.error(`${this.manifest.id}: Sync failed.`, err);
				});
			}
		};

		if (interval) {
			// Run once if the last time synced is outside the interval.
			if (!this.syncing && (!this.lastSynced || (moment.now() - this.lastSynced) >= interval)) {
				action();
			}
			this.syncIntervalId = window.setInterval(action, interval);
		};
	}

	/**
	 * Set the sync interval.
	 * 
	 * This function will not modify the {@link pause} state.
	 * 
	 * @param interval Sync interval, in milliseconds.
	 */
	setSyncInterval(interval: number | null) {
		this.syncIntervalMs = interval;
		this.app.saveLocalStorage(SYNC_INTERVAL_KEY, interval);
	}

	/**
	 * Get the sync interval.
	 * 
	 * @returns Sync interval, in milliseconds.
	 */
	getSyncInterval(): number | null {
		return this.app.loadLocalStorage(SYNC_INTERVAL_KEY) as number;
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
		this.setStatus();
	}

	/**
	 * Update status bar.
	 */
	private _updateStatusBar() {
		setIcon(this.statusIconEl, getIconByStatus(this.syncStatus));
		setTooltip(this.statusBarEl, this.getStatusText(), { placement: 'top' });

		this.statusIconEl.toggleClass('mod-spin', this.syncStatus === SyncStatus.SYNCING);
		setColor(this.statusIconEl, getColorByStatus(this.syncStatus));

		this.statusBarEl.onClickEvent((ev: MouseEvent) => {
			this.openStatusIconMenu(ev);
		});
		this.statusIconEl.onClickEvent((ev: MouseEvent) => {
			this.openStatusIconMenu(ev);
		});
	}

	/**
	 * Registers a new status bar item in Desktop and Mobile.
	 */
	private _registerStatusBarItem() {
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
			}
		} else {
			this.statusIconEl = this.statusBarEl.createEl('div', { cls: ['status-bar-item-segment'] })
				.createEl('span', { cls: ['status-bar-item-icon', 'awan-status-icon'] });
		}
		this._updateStatusBar();
	}
}
