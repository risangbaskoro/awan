import { App, IconName, PluginSettingTab } from "obsidian";
import Awan from "./main";
import { S3SettingsGroup } from "ui/settings/s3SettingsGroup";
import { SelectiveSyncSettingsGroup } from "ui/settings/selectiveSyncSettingsGroup";
import { VaultSyncSettingsGroup } from "ui/settings/vaultSyncSettingsGroup";
import { DebugSettingsGroup } from "ui/settings/debugSettingsGroup";
import { isDevelopment } from "utils/constants";
import { AdvancedSettingsGroup } from "ui/settings/advancedSettingsGroup";
import { GeneralSettingsGroup } from "ui/settings/generalSettingsGroup";

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

		// General settings.
		new GeneralSettingsGroup(containerEl, this.app, this.plugin);

		// Selective sync settings.
		new SelectiveSyncSettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`Selective sync`);

		// Vault configuration sync settings.
		new VaultSyncSettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`Vault configuration sync`);

		// TODO: Move this settings group to a modal.
		// Remote storage settings.
		new S3SettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`S3`);

		// Advanced settings.
		new AdvancedSettingsGroup(containerEl, this.app, this.plugin)
			.setHeading(`Advanced`);

		// Debug settings group.
		if (isDevelopment()) {
			new DebugSettingsGroup(containerEl, this.app, this.plugin)
				.setHeading(`Debug`);
		}
	}
}
