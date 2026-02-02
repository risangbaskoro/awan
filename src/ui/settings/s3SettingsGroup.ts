import Awan from "main";
import { App, SecretComponent, SettingGroup } from "obsidian";

/**
 * Display S3 settings.
 * All data from here should be saved under `S3Settings`.
 */
export class S3SettingsGroup extends SettingGroup {
    constructor(containerEl: HTMLElement, private app: App, private plugin: Awan) {
        super(containerEl);

        this
            .addSetting(setting => {
                setting
                    .setName('Access key')
                    .addComponent((el: HTMLElement) => new SecretComponent(this.app, el)
                        .setValue(this.plugin.settings.s3.accessKeyId ?? "")
                        .onChange(async (value: string) => {
                            this.plugin.settings.s3.accessKeyId = value;
                            await this.plugin.saveSettings();
                        }))
            })
            .addSetting(setting => {
                setting
                    .setName('Secret key')
                    .addComponent((el: HTMLElement) => new SecretComponent(this.app, el)
                        .setValue(this.plugin.settings.s3.secretAccessKey ?? "")
                        .onChange(async (value: string) => {
                            this.plugin.settings.s3.secretAccessKey = value;
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
                            this.plugin.settings.s3.endpoint = value;
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
                            this.plugin.settings.s3.region = value;
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
                            this.plugin.settings.s3.bucket = value;
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
            });
    }
}