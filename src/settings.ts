import { App, IconName, PluginSettingTab, SettingGroup } from "obsidian";
import Awan from "./main";
import type { S3Config, SupportedServiceType } from "./types";
import { S3SettingsGroup } from "ui/settings/s3SettingsGroup";
import { SelectiveSyncSettingsGroup } from "ui/settings/selectiveSyncSettingsGroup";
import { VaultSyncSettingsGroup } from "ui/settings/vaultSyncSettingsGroup";
import { DebugSettingsGroup } from "ui/settings/debugSettingsGroup";

/** Settings enable sync vault settings. */
export interface VaultSyncSettings {
	/** Whether to sync main settings (stored in `app.json`) */
	main: boolean;
	/** Whether to sync appearance settings (stored in `appearance.json`) */
	appearance: boolean;
	/** Whether to sync theme settings (currently IDK where it stored) */
	themes: boolean;
	/** Whether to sync hotkeys settings (stored in `hotkeys.json`) */
	hotkeys: boolean;
	/** Whether to sync active core plugins (stored in `core-plugins.json`) */
	activeCorePlugins: boolean;
	/** Whether to sync core plugin settings (stored in various JSON files, i.e. `daily-notes.json`, `page-preview.json`, `zk-prefixer.json`) */
	corePluginSettings: boolean;
	/** Whether to sync active community plugins (stored in `community-plugins.json`) */
	activeCommunityPlugins: boolean;
	/** Whether to sync community plugin settings (stored inside `plugins/` folder. Must exclude this plugin settings!) */
	communityPluginSettings: boolean;
}

/** Settings to select which files in the vault to be synced. */
export interface SelectiveSyncSettings {
	/** Folders (directory, prefix) to exclude from being synced. */
	excludedFolders: string[];
	/** Whether should sync image files. */
	imageFiles: boolean;
	/** Whether should sync audio files. */
	audioFiles: boolean;
	/** Whether should sync video files. */
	videoFiles: boolean;
	/** Whether should sync PDF files. */
	pdfFiles: boolean;
	/** Whether should sync misc mime-type files. */
	otherFiles: boolean;
}

export interface AwanSettings {
	/** The service type to use */
	serviceType: SupportedServiceType;
	/** The key to password in Obsidian keychain for encryption. */
	password: string;
	/** Scheduled sync configuration. */
	scheduledSync: {
		/** Whether to enable scheduled sync. */
		enabled?: boolean;
		/** Sync interval in milliseconds. */
		interval?: number;
	};
	/** Settings enable sync vault settings. */
	vaultSyncSettings: VaultSyncSettings;
	/** Settings to select which files in the vault to be synced. */
	selectiveSync: SelectiveSyncSettings;
	/** S3 configurations. */
	s3: S3Config;
}

export class AwanSettingTab extends PluginSettingTab {
	plugin: Awan;
	icon: IconName = 'cloud';

	constructor(app: App, plugin: Awan) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const generalSettings = new SettingGroup(containerEl)
			.addSetting(setting => {
				setting
					.setName('Auto sync')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.scheduledSync.enabled ?? false)
						.onChange(async (value: boolean) => {
							this.plugin.settings.scheduledSync.enabled = value;
							await this.plugin.saveSettings();
							this.display();
						}))
			});

		if (this.plugin.settings.scheduledSync.enabled) {
			generalSettings
				.addSetting(setting => {
					setting
						.setName('Sync interval (minutes)')
						.setDesc('Scheduled sync interval in minutes.')
						.addText(text => text
							.setValue((Math.max(this.plugin.settings.scheduledSync.interval ?? 0, 0) / 60000).toString())
							.onChange(async (value: string) => {
								this.plugin.settings.scheduledSync.interval = Math.max(Number(value), 0) * 60000; // In convert to minutes
								await this.plugin.saveSettings();
							})
						)
				})
		}

		// Selective sync settings.
		new SelectiveSyncSettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`Selective sync`);

		// Vault settings.
		new VaultSyncSettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`Vault configuration`);

		// Remote storage settings.
		new S3SettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`S3 configuration`);

		// Debug settings group.
		if (Awan.isDevelopment()) {
			new DebugSettingsGroup(containerEl, this.app, this.plugin)
				.setHeading(`Debug`);
		}
	}
}
