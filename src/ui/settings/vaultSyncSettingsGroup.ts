import Awan from "main";
import { App, SettingGroup } from "obsidian";

/**
 * Display settings related to syncing vault settings.
 */
export class VaultSyncSettingsGroup extends SettingGroup {
    constructor(containerEl: HTMLElement, private app: App, private plugin: Awan) {
        super(containerEl);

        this
            .addSetting(setting => {
                setting
                    .setName(`Main settings`)
                    .setDesc(`Sync editor, file, link settings.`)
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.vaultSyncSettings.main)
                        .onChange(async (value: boolean) => {
                            this.plugin.settings.vaultSyncSettings.main = value;
                            await this.plugin.saveSettings();
                        }))
            })
            .addSetting(setting => {
                setting
                    .setName(`Appearance settings`)
                    .setDesc(`Sync dark mode, active theme, and enabled snippets.`)
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.vaultSyncSettings.appearance)
                        .onChange(async (value: boolean) => {
                            this.plugin.settings.vaultSyncSettings.appearance = value;
                            await this.plugin.saveSettings();
                        }))
            })
            .addSetting(setting => {
                setting
                    .setName(`Hotkeys`)
                    .setDesc(`Sync custom hotkeys.`)
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.vaultSyncSettings.hotkeys)
                        .onChange(async (value: boolean) => {
                            this.plugin.settings.vaultSyncSettings.hotkeys = value;
                            await this.plugin.saveSettings();
                        }))
            })
            .addSetting(setting => {
                setting
                    .setName(`Active core plugins`)
                    .setDesc(`Sync which core plugins are enabled.`)
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.vaultSyncSettings.activeCorePlugins)
                        .onChange(async (value: boolean) => {
                            this.plugin.settings.vaultSyncSettings.activeCorePlugins = value;
                            await this.plugin.saveSettings();
                        }))
            })
            .addSetting(setting => {
                setting
                    .setName(`Core plugins settings`)
                    .setDesc(`Sync core plugins settings.`)
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.vaultSyncSettings.corePluginSettings)
                        .onChange(async (value: boolean) => {
                            this.plugin.settings.vaultSyncSettings.corePluginSettings = value;
                            await this.plugin.saveSettings();
                        }))
            })
            .addSetting(setting => {
                setting
                    .setName(`Active community plugins`)
                    .setDesc(`Sync which community plugins are enabled.`)
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.vaultSyncSettings.activeCommunityPlugins)
                        .onChange(async (value: boolean) => {
                            this.plugin.settings.vaultSyncSettings.activeCommunityPlugins = value;
                            await this.plugin.saveSettings();
                        }))
            })
            .addSetting(setting => {
                setting
                    .setName(`Community plugins settings`)
                    .setDesc(`Sync community plugin settings.`)
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.vaultSyncSettings.communityPluginSettings)
                        .onChange(async (value: boolean) => {
                            this.plugin.settings.vaultSyncSettings.communityPluginSettings = value;
                            await this.plugin.saveSettings();
                        }))
            })
    }
}