import { App, debounce, IconName, PluginSettingTab, SettingGroup } from "obsidian";
import Awan from "./main";
import { S3SettingsGroup } from "ui/settings/s3SettingsGroup";
import { SelectiveSyncSettingsGroup } from "ui/settings/selectiveSyncSettingsGroup";
import { VaultSyncSettingsGroup } from "ui/settings/vaultSyncSettingsGroup";
import { DebugSettingsGroup } from "ui/settings/debugSettingsGroup";

export class AwanSettingTab extends PluginSettingTab {
	plugin: Awan;
	icon: IconName = 'cloud';

	private updateAutoSync = debounce(
		async () => await this.plugin.updateAutoSync(),
		1000,
		true
	);

	constructor(app: App, plugin: Awan) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const { localSettings } = this.plugin;
		containerEl.empty();

		const generalSettings = new SettingGroup(containerEl)
			.addSetting(setting => {
				setting
					.setName(`${this.plugin.manifest.name} status`)
					.setDesc(`Awan is currently ${localSettings.enabled ? 'running' : 'paused'}.`)
					.addButton((button) => button
						.setButtonText(localSettings.enabled ? 'Pause' : 'Resume')
						.onClick(() => {
							this.plugin.localSettings.enabled = !localSettings.enabled;
							this.plugin.saveLocalSettings();
							this.display();
							this.updateAutoSync();
						})
					)
			});
		if (this.plugin.localSettings.enabled) {
			generalSettings
				.addSetting(setting => {
					setting
						.setName('Sync interval (minutes)')
						.setDesc('Scheduled sync interval in minutes.')
						.addExtraButton(btn => btn
							.setIcon('reset')
							.onClick(() => {
								this.plugin.localSettings.syncIntervalMs = 60000 * 5;
								this.plugin.saveLocalSettings();
								this.display();
								this.updateAutoSync();
							})
						)
						.addSlider(slider => slider
							.setLimits(1, 20, 1)
							.setInstant(true)
							.setDynamicTooltip()
							.setValue(Math.max(this.plugin.localSettings.syncIntervalMs ?? 0, 5) / 60000)
							.onChange((value: number) => {
								const newInterval = Math.max(value, 1) * 60000; // In convert to minutes
								this.plugin.localSettings.syncIntervalMs = newInterval;
								this.plugin.saveLocalSettings();
								this.updateAutoSync();
							})
						)
				})
		}

		// Selective sync settings.
		new SelectiveSyncSettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`Selective sync`);

		// Vault settings.
		new VaultSyncSettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`Vault configuration`);

		// Remote storage settings.
		new S3SettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`S3 configuration`);

		// Debug settings group.
		if (Awan.isDevelopment()) {
			new DebugSettingsGroup(containerEl, this.app, this.plugin)
				.setHeading(`Debug`);
		}
	}
}
