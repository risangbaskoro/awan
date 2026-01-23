import { App, IconName, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import Awan from "./main";
import { DEFAULT_S3_CONFIG, } from "./fsS3";
import type { S3Config, SupportedServiceType, WebDAVConfig } from "types";
import { DEFAULT_WEBDAV_CONFIG } from "fsWebdav";


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

export const DEFAULT_SETTINGS: Partial<AwanSettings> = {
	password: '',
	syncInterval: 5 * 60000,
	serviceType: 's3',
	s3: DEFAULT_S3_CONFIG,
	webdav: DEFAULT_WEBDAV_CONFIG
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

		this.displayGeneralSettings(containerEl)

		// Only show S3 settings if S3 is selected
		if (this.plugin.settings.serviceType === 's3') {
			this.displayS3Settings(containerEl)
		} else if (this.plugin.settings.serviceType === 'webdav') {
			this.displayWebDAVSettings(containerEl)
		}
	}

	private displayGeneralSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setHeading()
			.setName('General')
			.setDesc('General settings.')

		new Setting(containerEl)
			.setName('Service type')
			.setDesc('Choose the cloud storage service to use for syncing.')
			.addDropdown(dropdown => dropdown
				.addOption('s3', 'Amazon S3 / S3-compatible')
				.addOption('webdav', 'WebDAV (not yet implemented)') // eslint-disable-line
				.setValue(this.plugin.settings.serviceType ?? 's3')
				.onChange(async (value: SupportedServiceType) => {
					this.plugin.settings.serviceType = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh the settings display
				}));

		new Setting(containerEl)
			.setName('Auto sync')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSync ?? false)
				.onChange(async (value: boolean) => {
					this.plugin.settings.autoSync = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Sync interval (minutes)')
			.setDesc('Scheduled sync interval in minutes. Will be ignored if auto sync is disabled.')
			.addText(text => text
				.setValue((Math.max(this.plugin.settings.syncInterval, 0) / 60000).toString())
				.onChange(async (value: string) => {
					this.plugin.settings.syncInterval = Math.max(Number(value), 0) * 60000; // In convert to minutes
					await this.plugin.saveSettings();
				})
			)
	}

	/**
	 * Display S3 settings.
	 * All data from here should be saved under `S3Settings`.
	 *
	 * @private
	 */
	private displayS3Settings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setHeading()
			.setName('S3')
			.setDesc('Set up your S3 storage settings.')

		new Setting(containerEl)
			.setName('Access key')
			.setDesc('S3 compatible access key')
			.addComponent((el: HTMLElement) => new SecretComponent(this.app, el)
				.setValue(this.plugin.settings.s3.accessKeyId ?? "")
				.onChange(async (value: string) => {
					this.plugin.settings.s3.accessKeyId = value;
					await this.plugin.saveSettings();
				})
			)

		new Setting(containerEl)
			.setName('Secret key')
			.setDesc('S3 compatible secret key')
			.addComponent((el: HTMLElement) => new SecretComponent(this.app, el)
				.setValue(this.plugin.settings.s3.secretAccessKey ?? "")
				.onChange(async (value: string) => {
					this.plugin.settings.s3.secretAccessKey = value;
					await this.plugin.saveSettings();
				})
			)

		new Setting(containerEl)
			.setName('Endpoint')
			.addText(text => text
				.setPlaceholder('https://bucketname.s3.region.amazonaws.com')
				.setValue(this.plugin.settings.s3.endpoint ?? "")
				.onChange(async (value: string) => {
					this.plugin.settings.s3.endpoint = value;
					await this.plugin.saveSettings();
				}))


		new Setting(containerEl)
			.setName('Region')
			.addText(text => text
				.setPlaceholder('Region')
				.setValue(this.plugin.settings.s3.region ?? "")
				.onChange(async (value: string) => {
					this.plugin.settings.s3.region = value;
					await this.plugin.saveSettings();
				}))


		new Setting(containerEl)
			.setName('Bucket')
			.addText(text => text
				.setPlaceholder('Bucket')
				.setValue(this.plugin.settings.s3.bucket ?? "")
				.onChange(async (value: string) => {
					this.plugin.settings.s3.bucket = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Concurrency')
			.addSlider(slider => slider
				.setLimits(1, 20, 1)
				.setDynamicTooltip()
				.setValue(this.plugin.settings.s3.partsConcurrency ?? 5)
				.onChange(async (value: number) => {
					this.plugin.settings.s3.partsConcurrency = value;
					await this.plugin.saveSettings();
				})
			)

		new Setting(containerEl)
			.setName('Force path style')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.s3.forcePathStyle ?? false)
				.onChange(async (value: boolean) => {
					this.plugin.settings.s3.forcePathStyle = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Remote prefix')
			.addText(text => text
				.setValue(this.plugin.settings.s3.remotePrefix ?? "")
				.onChange(async (value: string) => {
					this.plugin.settings.s3.remotePrefix = value;
					await this.plugin.saveSettings();
				})
			)
	}

	/**
	 * Display WebDAV settings.
	 *
	 * @private
	 */
	private displayWebDAVSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setHeading()
			.setName('WebDAV') // eslint-disable-line
			.setDesc('WebDAV settings') // eslint-disable-line

		new Setting(containerEl)
			.setName('WebDAV URL') // eslint-disable-line
			.setDesc('WebDAV server URL (e.g., https://example.com/webdav)')
			.addText(text => text
				.setPlaceholder('https://example.com/webdav')
				.setValue(this.plugin.settings.webdav.url ?? "")
				.onChange(async (value: string) => {
					this.plugin.settings.webdav.url = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Username')
			.addText(text => text
				.setValue(this.plugin.settings.webdav.username ?? "")
				.onChange(async (value: string) => {
					this.plugin.settings.webdav.username = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Password')
			.addComponent((el: HTMLElement) => new SecretComponent(this.app, el)
				.setValue(this.plugin.settings.webdav.password ?? "")
				.onChange(async (value: string) => {
					this.plugin.settings.webdav.password = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Status')
			.setDesc('WebDAV support is coming in a future version.') // eslint-disable-line
	}
}
