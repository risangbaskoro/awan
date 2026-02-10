import { Entity } from "types";
import { FileFilter } from "./abstract";
import Awan from "main";

export class VaultCorePluginSettingsFilter extends FileFilter {
	private excludedFiles: Set<string>;

	constructor(plugin: Awan) {
		super(plugin);
		const configDir = this.plugin.app.vault.configDir;
		this.excludedFiles = new Set([
			`${configDir}/app.json`,
			`${configDir}/appearance.json`,
			`${configDir}/hotkeys.json`,
			`${configDir}/core-plugins.json`,
			`${configDir}/community-plugins.json`,
			// TODO: Handle workspace sync
			// `${configDir}/workspace.json`,
			// `${configDir}/workspace-mobile.json`
		]);
	}

	public evaluate(entity: Entity): boolean {
		const configDir = this.plugin.app.vault.configDir;

		// Check if file is in the root of config dir
		const lastSlashIndex = entity.key.lastIndexOf('/');
		const directory = entity.key.substring(0, lastSlashIndex);

		// If directory is NOT the config dir (meaning it's in a subdir), ignore it
		if (directory !== configDir) {
			return false;
		}

		// If it's one of the explicitly excluded files, ignore it (handled by other filters)
		if (this.excludedFiles.has(entity.key)) {
			return false;
		}

		// If it is a JSON file, it's likely a core plugin setting
		if (entity.key.endsWith('.json')) {
			return true;
		}

		return false;
	}

	protected shouldAllow(): boolean {
		return this.plugin.settings.vaultSyncSettings.corePluginSettings;
	}
}
