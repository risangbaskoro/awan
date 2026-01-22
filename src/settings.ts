import { App, IconName, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import Awan from "./main";
import { DEFAULT_S3_CONFIG, S3Config } from "./fsS3";


export interface GeneralSettings {
	/** The key to password in Obsidian keychain for encryption. */
	password: string;
	autoSync: boolean;
	syncInterval: number;
}

export interface AwanSettings extends GeneralSettings {
	s3: S3Config;
}

export const DEFAULT_SETTINGS: Partial<AwanSettings> = {
	password: '',
	syncInterval: 5 * 60000,
	s3: DEFAULT_S3_CONFIG
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
		this.displayS3Settings(containerEl)
	}

	private displayGeneralSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setHeading()
			.setName('General')
			.setDesc('General settings.')

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
			.setDesc('Sync interval in minutes. Will be ignored if auto sync is disabled.')
			.addText(text => text
				.setValue((this.plugin.settings.syncInterval / 60000).toString())
				.onChange(async (value: string) => {
					this.plugin.settings.syncInterval = Number(value) * 60000; // In convert to minutes
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
			.setDesc('Setup your S3 storage settings.')

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
			.setName('Force path style')
			.addToggle(toggle => toggle
				.onChange(async (value: boolean) => {
					this.plugin.settings.s3.forcePathStyle = value;
					await this.plugin.saveSettings();
				}))
	}
}
