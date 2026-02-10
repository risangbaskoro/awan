import { Entity } from "types";
import { FileFilter } from "./abstract";

export class VaultActiveCommunityPluginsFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;
        if (entity.key === `${configDir}/community-plugins.json`) {
            return true;
        }
        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.vaultSyncSettings.activeCommunityPlugins;
    }
}
