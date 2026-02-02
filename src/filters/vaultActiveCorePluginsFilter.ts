import { Entity } from "types";
import { FileFilter } from "./abstract";

export class VaultActiveCorePluginsFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;
        if (entity.keyRaw === `${configDir}/core-plugins.json`) {
            return true;
        }
        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.vaultSyncSettings.activeCorePlugins;
    }
}
