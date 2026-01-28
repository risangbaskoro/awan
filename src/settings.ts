import { App, IconName, PluginSettingTab, SecretComponent, SettingGroup } from "obsidian";
import Awan from "./main";
import type { S3Config, SupportedServiceType } from "./types";
import { AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from "./utils/constants";
import { ExcludedFoldersModal } from "ui/modal";

export interface GeneralSettings {
	/** The service type to use */
	serviceType: SupportedServiceType;
	/** The key to password in Obsidian keychain for encryption. */
	password: string;
	/** Whether to enable scheduled sync. */
	autoSync: boolean;
	/** Sync interval in milliseconds. */
	syncInterval: number;
}

export interface VaultSettings {
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

export interface AwanSettings extends GeneralSettings {
	vaultSettings: VaultSettings;
	selectiveSync: SelectiveSyncSettings;
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
			.setHeading(`General`)
			// .addSetting(setting => {
			// 	setting
			// 		.setName('Service type')
			// 		.setDesc('Choose the cloud storage service to use for syncing.')
			// 		.addDropdown(dropdown => dropdown
			// 			.addOption('s3', 'Amazon S3 / S3-compatible')
			// 			.setValue(this.plugin.settings.serviceType ?? 's3')
			// 			.onChange(async (value: SupportedServiceType) => {
			// 				this.plugin.settings.serviceType = value;
			// 				await this.plugin.saveSettings();
			// 				this.display(); // Refresh the settings display
			// 			}))
			// })
			.addSetting(setting => {
				setting
					.setName('Auto sync')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.autoSync ?? false)
						.onChange(async (value: boolean) => {
							this.plugin.settings.autoSync = value;
							await this.plugin.saveSettings();
							this.display();
						}))
			});

		if (this.plugin.settings.autoSync) {
			generalSettings
				.addSetting(setting => {
					setting
						.setName('Sync interval (minutes)')
						.setDesc('Scheduled sync interval in minutes.')
						.addText(text => text
							.setValue((Math.max(this.plugin.settings.syncInterval, 0) / 60000).toString())
							.onChange(async (value: string) => {
								this.plugin.settings.syncInterval = Math.max(Number(value), 0) * 60000; // In convert to minutes
								await this.plugin.saveSettings();
							})
						)
				})
		}

		// Vault settings.
		this.displayVaultConfig(containerEl);

		// Selective sync settings.
		this.displaySelectiveSyncConfig(containerEl);

		// Remote storage settings.
		this.displayS3Config(containerEl);
	}

	/**
	 * Display configuration related to notes.
	 */
	private displayVaultConfig(containerEl: HTMLElement): void {
		new SettingGroup(containerEl)
			.setHeading(`Vault configuration`)
			.addSetting(setting => {
				setting
					.setName(`Main settings`)
					.setDesc(`Sync editor, file, link settings.`)
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.vaultSettings.main)
						.onChange(async (value: boolean) => {
							this.plugin.settings.vaultSettings.main = value;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName(`Appearance settings`)
					.setDesc(`Sync dark mode, active theme, and enabled snippets.`)
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.vaultSettings.appearance)
						.onChange(async (value: boolean) => {
							this.plugin.settings.vaultSettings.appearance = value;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName(`Hotkeys`)
					.setDesc(`Sync custom hotkeys.`)
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.vaultSettings.hotkeys)
						.onChange(async (value: boolean) => {
							this.plugin.settings.vaultSettings.hotkeys = value;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName(`Active core plugins`)
					.setDesc(`Sync which core plugins are enabled.`)
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.vaultSettings.activeCorePlugins)
						.onChange(async (value: boolean) => {
							this.plugin.settings.vaultSettings.activeCorePlugins = value;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName(`Core plugins settings`)
					.setDesc(`Sync core plugins settings.`)
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.vaultSettings.corePluginSettings)
						.onChange(async (value: boolean) => {
							this.plugin.settings.vaultSettings.corePluginSettings = value;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName(`Active community plugins`)
					.setDesc(`Sync which community plugins are enabled.`)
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.vaultSettings.activeCommunityPlugins)
						.onChange(async (value: boolean) => {
							this.plugin.settings.vaultSettings.activeCommunityPlugins = value;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName(`Community plugins settings`)
					.setDesc(`Sync community plugin settings.`)
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.vaultSettings.communityPluginSettings)
						.onChange(async (value: boolean) => {
							this.plugin.settings.vaultSettings.communityPluginSettings = value;
							await this.plugin.saveSettings();
						}))
			})
	}

	/**
	 * Display selective sync settings.
	 * Let users to choose whether to exclude folders or sync images, videos, audio, pdf.
	 */
	private displaySelectiveSyncConfig(containerEl: HTMLElement): void {
		new SettingGroup(containerEl)
			.setHeading(`Selective sync`)
			.addSetting(setting => {
				setting
					.setName(`Excluded folders`)
					.setDesc(`Prevent certain folders from being synced to remote storage.`)
					.addButton(button => {
						button
							.setButtonText(`Configure`)
							.onClick(() => {
								new ExcludedFoldersModal(this.app, this.plugin).open();
							})
					})
			})
			.addSetting(setting => {
				setting
					.setName(`Sync image files`)
					.setDesc(`Allow image files (${IMAGE_EXTENSIONS.join(', ')}) to be synced.`)
					.addToggle(toggle => {
						toggle
							.setValue(this.plugin.settings.selectiveSync.imageFiles)
							.onChange(async (value: boolean) => {
								this.plugin.settings.selectiveSync.imageFiles = value;
								await this.plugin.saveSettings();
							})
					})
			})
			.addSetting(setting => {
				setting
					.setName(`Sync audio files`)
					.setDesc(`Allow audio files (${AUDIO_EXTENSIONS.join(', ')}) to be synced.`)
					.addToggle(toggle => {
						toggle
							.setValue(this.plugin.settings.selectiveSync.audioFiles)
							.onChange(async (value: boolean) => {
								this.plugin.settings.selectiveSync.audioFiles = value;
								await this.plugin.saveSettings();
							})
					})
			})
			.addSetting(setting => {
				setting
					.setName(`Sync video files`)
					.setDesc(`Allow video files (${VIDEO_EXTENSIONS.join(', ')}) to be synced.`)
					.addToggle(toggle => {
						toggle
							.setValue(this.plugin.settings.selectiveSync.videoFiles)
							.onChange(async (value: boolean) => {
								this.plugin.settings.selectiveSync.videoFiles = value;
								await this.plugin.saveSettings();
							})
					})
			})
			.addSetting(setting => {
				setting
					.setName(`Sync PDF files`)
					.setDesc(`Allow PDF files to be synced.`)
					.addToggle(toggle => {
						toggle
							.setValue(this.plugin.settings.selectiveSync.pdfFiles)
							.onChange(async (value: boolean) => {
								this.plugin.settings.selectiveSync.pdfFiles = value;
								await this.plugin.saveSettings();
							})
					})
			})
			.addSetting(setting => {
				setting
					.setName(`Sync all other types`)
					.setDesc(`Allow other file types to be synced.`)
					.addToggle(toggle => {
						toggle
							.setValue(this.plugin.settings.selectiveSync.otherFiles)
							.onChange(async (value: boolean) => {
								this.plugin.settings.selectiveSync.otherFiles = value;
								await this.plugin.saveSettings();
							})
					})
			})
	}

	/**
	 * Display S3 settings.
	 * All data from here should be saved under `S3Settings`.
	 *
	 * @private
	 */
	private displayS3Config(containerEl: HTMLElement): void {
		new SettingGroup(containerEl)
			.setHeading(`S3 configuration`)
			.addSetting(setting => {
				setting
					.setName('Access key')
					.addComponent((el: HTMLElement) => new SecretComponent(this.app, el)
						.setValue(this.plugin.settings.s3.accessKeyId ?? "")
						.onChange(async (value: string) => {
							this.plugin.settings.s3.accessKeyId = value ? value : undefined;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Secret key')
					.addComponent((el: HTMLElement) => new SecretComponent(this.app, el)
						.setValue(this.plugin.settings.s3.secretAccessKey ?? "")
						.onChange(async (value: string) => {
							this.plugin.settings.s3.secretAccessKey = value ? value : undefined;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Endpoint')
					.addText(text => text
						.setPlaceholder('https://bucketname.s3.region.amazonaws.com')
						.setValue(this.plugin.settings.s3.endpoint ?? "")
						.onChange(async (value: string) => {
							this.plugin.settings.s3.endpoint = value ? value : undefined;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Region')
					.addText(text => text
						.setPlaceholder('Region')
						.setValue(this.plugin.settings.s3.region ?? "")
						.onChange(async (value: string) => {
							this.plugin.settings.s3.region = value ? value : undefined;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Bucket')
					.addText(text => text
						.setPlaceholder('Bucket')
						.setValue(this.plugin.settings.s3.bucket ?? "")
						.onChange(async (value: string) => {
							this.plugin.settings.s3.bucket = value ? value : undefined;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Concurrency')
					.addSlider(slider => slider
						.setLimits(1, 20, 1)
						.setDynamicTooltip()
						.setValue(this.plugin.settings.s3.partsConcurrency ?? 5)
						.onChange(async (value: number) => {
							this.plugin.settings.s3.partsConcurrency = value;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Force path style')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.s3.forcePathStyle ?? false)
						.onChange(async (value: boolean) => {
							this.plugin.settings.s3.forcePathStyle = value;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Remote prefix')
					.addText(text => text
						.setValue(this.plugin.settings.s3.remotePrefix ?? "")
						.onChange(async (value: string) => {
							this.plugin.settings.s3.remotePrefix = value;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Locally bypass CORS') // eslint-disable-line
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.s3.bypassCorsLocally ?? true)
						.onChange(async (value: boolean) => {
							this.plugin.settings.s3.bypassCorsLocally = value;
							await this.plugin.saveSettings();
						}))
			})
	}
}
