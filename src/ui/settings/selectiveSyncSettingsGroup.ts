import Awan from "main";
import { App, SettingGroup } from "obsidian";
import { ExcludedFoldersModal } from "ui/modals/excludedFolders";
import { AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from "utils/constants";

/**
 * Display selective sync settings.
 * Let users to choose whether to exclude folders or sync images, videos, audio, pdf.
 */
export class SelectiveSyncSettingsGroup extends SettingGroup {
    constructor(containerEl: HTMLElement, private app: App, private plugin: Awan) {
        super(containerEl);

        this
            .addSetting(setting => {
                setting
                    .setName(`Excluded folders`)
                    .setDesc(`Prevent certain folders from being synced to remote storage.`)
                    .addButton(button => {
                        button
                            .setButtonText(`Manage`)
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
}