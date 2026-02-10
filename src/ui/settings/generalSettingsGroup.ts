import Awan from "main";
import { App, Debouncer, SettingGroup } from "obsidian";

export class GeneralSettingsGroup extends SettingGroup {
    updateAutoSync: Debouncer<[], void>;

    constructor(containerEl: HTMLElement, private app: App, private plugin: Awan) {
        super(containerEl);

        this.updateAutoSync = this.plugin.requestUpdateSyncInterval();

        this
            .addSetting(setting => {
                const settingReset = () => {
                    setting.clear();
                    setting
                        .setName(`${this.plugin.manifest.name} status`)
                        .setDesc(`Awan is currently ${this.plugin.getPause() ? 'paused' : 'running'}.`)
                        .addButton((button) => button
                            .setButtonText(this.plugin.getPause() ? 'Resume' : 'Pause')
                            .onClick(() => {
                                this.plugin.setPause(!this.plugin.getPause());
                                settingReset();
                            })
                        )
                }
                return settingReset();
            });

        if (!this.plugin.getPause()) {
            this
                .addSetting(setting => {
                    const settingReset = () => {
                        setting.clear();
                        setting
                            .setName('Sync interval (minutes)')
                            .setDesc('Scheduled sync interval in minutes.')
                            .addExtraButton(btn => btn
                                .setIcon('reset')
                                .onClick(() => {
                                    this.plugin.setSyncInterval(6000 * 5);
                                    this.updateAutoSync();
                                    settingReset();
                                })
                            )
                            .addSlider(slider => slider
                                .setLimits(1, 20, 1)
                                .setInstant(false)
                                .setDynamicTooltip()
                                .setValue(Math.max(this.plugin.getSyncInterval() ?? 0, 5) / 60000)
                                .onChange((value: number) => {
                                    const newInterval = Math.max(value, 1) * 60000; // In convert to minutes
                                    this.plugin.setSyncInterval(newInterval);
                                    this.updateAutoSync();
                                })
                            )
                    }
                    return settingReset();
                })
        }
    }
}