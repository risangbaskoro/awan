import Awan from "main";
import { App, SettingGroup } from "obsidian";

export class DebugSettingsGroup extends SettingGroup {
    constructor(containerEl: HTMLElement, private app: App, private plugin: Awan) {
        super(containerEl);

        this
            .addSetting(setting => {
                setting
                    .setName(`Clear previous sync cache`)
                    .setDesc(`Clearing the cache may break the sync algorithm. Use carefully.`)
                    .addButton(button => button
                        .setWarning()
                        .setButtonText(`Clear`)
                        .onClick(async () => {
                            await this.plugin.database.previousSync.clear();
                        }))
            })
    }
}