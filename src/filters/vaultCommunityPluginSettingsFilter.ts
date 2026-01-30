import { Entity } from "filesystems/abstract";
import { FileFilter } from "./abstract";

export class VaultCommunityPluginSettingsFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;
        const pluginsPrefix = `${configDir}/plugins/`;

        // Check if it is inside plugins folder
        if (!entity.keyRaw.startsWith(pluginsPrefix)) {
            return false;
        }

        // Check if it is THIS plugin
        const awanPluginPrefix = `${pluginsPrefix}${this.plugin.manifest.id}/`;
        if (entity.keyRaw.startsWith(awanPluginPrefix)) {
            return false;
        }

        return true;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.vaultSyncSettings.communityPluginSettings;
    }
}
