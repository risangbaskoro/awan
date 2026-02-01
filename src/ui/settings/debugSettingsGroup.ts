import Awan from "main";
import { App, Notice, SettingGroup } from "obsidian";

export class DebugSettingsGroup extends SettingGroup {
    constructor(containerEl: HTMLElement, private app: App, private plugin: Awan) {
        super(containerEl);

        this
            .addSetting(setting => {
                setting
                    .setName(`Clear previous sync cache`)
                    .setDesc(`Clearing the cache may break the sync algorithm. Use carefully.`)
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