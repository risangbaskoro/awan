import { App, IconName, PluginSettingTab, SecretComponent, SettingGroup } from "obsidian";
import Awan from "./main";
import type { S3Config, SupportedServiceType, WebDAVConfig } from "types";

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

export interface AwanSettings extends GeneralSettings {
	s3: S3Config;
	webdav: WebDAVConfig;
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
			.addSetting(setting => {
				setting
					.setName('Service type')
					.setDesc('Choose the cloud storage service to use for syncing.')
					.addExtraButton(button => button
						.setIcon(this.plugin.isSyncing ? 'rotate-cw' : 'wifi-sync')
						.setDisabled(this.plugin.isSyncing)
						.setTooltip(`Test connection`)
						.onClick(async () => {
							await this.plugin.testConnection();
						}))
					.addDropdown(dropdown => dropdown
						.addOption('s3', 'Amazon S3 / S3-compatible')
						.addOption('webdav', 'WebDAV (not yet implemented)') // eslint-disable-line
						.setValue(this.plugin.settings.serviceType ?? 's3')
						.onChange(async (value: SupportedServiceType) => {
							this.plugin.settings.serviceType = value;
							await this.plugin.saveSettings();
							this.display(); // Refresh the settings display
						}))
			})
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

		// Remote storage settings
		if (this.plugin.settings.serviceType === 's3') {
			this.displayS3Config(containerEl);
		} else if (this.plugin.settings.serviceType === 'webdav') {
			this.displayWebDAVConfig(containerEl)
		}
	}

	/**
	 * Display S3 settings.
	 * All data from here should be saved under `S3Settings`.
	 *
	 * @private
	 */
	private displayS3Config(containerEl: HTMLElement): void {
		new SettingGroup(containerEl)
			.setHeading(`S3-compatible configurations`)
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

	/**
	 * Display WebDAV settings.
	 *
	 * @private
	 */
	private displayWebDAVConfig(containerEl: HTMLElement): void {
		new SettingGroup(containerEl)
			.setHeading('WebDAV')
			.addSetting(setting => {
				setting
					.setName('Status')
					.setDesc('WebDAV support is coming in a future version.') // eslint-disable-line
			})
			.addSetting(setting => {
				setting
					.setName('WebDAV URL') // eslint-disable-line
					.setDesc('WebDAV server URL (e.g., https://example.com/webdav)')
					.addText(text => text
						.setPlaceholder('https://example.com/webdav')
						.setValue(this.plugin.settings.webdav.url ?? "")
						.onChange(async (value: string) => {
							this.plugin.settings.webdav.url = value ? value : undefined;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Username')
					.addText(text => text
						.setValue(this.plugin.settings.webdav.username ?? "")
						.onChange(async (value: string) => {
							this.plugin.settings.webdav.username = value ? value : undefined;
							await this.plugin.saveSettings();
						}))
			})
			.addSetting(setting => {
				setting
					.setName('Password')
					.addComponent((el: HTMLElement) => new SecretComponent(this.app, el)
						.setValue(this.plugin.settings.webdav.password ?? "")
						.onChange(async (value: string) => {
							this.plugin.settings.webdav.password = value ? value : undefined;
							await this.plugin.saveSettings();
						}))
			})
	}
}
