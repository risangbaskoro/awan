import Awan from "main";
import { App, Notice, SettingGroup } from "obsidian";

export class AdvancedSettingsGroup extends SettingGroup {
    constructor(containerEl: HTMLElement, private app: App, private plugin: Awan) {
        super(containerEl);

        this
            .addSetting(setting => {
                const settingReset = () => {
                    setting.clear();
                    setting
                        .setName(`Concurrency`)
                        .addExtraButton(button => button
                            .setIcon('reset')
                            .onClick(async () => {
                                plugin.settings.concurrency = 5;
                                await plugin.saveSettings();
                                settingReset();
                            })
                        )
                        .addSlider(slider => slider
                            .setDynamicTooltip()
                            .setLimits(1, 20, 1)
                            .setInstant(false)
                            .setValue(plugin.settings.concurrency)
                            .onChange(async (value: number) => {
                                plugin.settings.concurrency = value;
                                await plugin.saveSettings();
                            })
                        );
                }
                return settingReset();
            })
            .addSetting(setting => {
                setting
                    .setName(`Clear previous sync cache`)
                    .setDesc(`Clearing the cache may break the sync algorithm and overwrite your files. Please use carefully.`)
                    .addButton(button => button
                        .setClass('mod-destructive')
                        .setButtonText(`Clear`)
                        .onClick(async () => {
                            try {
                                await this.plugin.database.previousSync.clear();
                                new Notice(`Previous sync cached cleared.`);
                            } catch {
                                const failedNotice = new Notice(`Failed to clear the previous sync cache.`);
                                failedNotice.containerEl.addClass('mod-warning');
                            }
                        }))
            })
    }
}