import { Entity } from "types";
import { FileFilter } from "./abstract";

export class VaultMainSettingsFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        // We only care about app.json in the config dir
        const configDir = this.plugin.app.vault.configDir;
        if (entity.keyRaw === `${configDir}/app.json`) {
            return true;
        }

        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.vaultSyncSettings.main;
    }
}
