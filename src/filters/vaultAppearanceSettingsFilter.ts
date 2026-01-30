import { Entity } from "filesystems/abstract";
import { FileFilter } from "./abstract";

export class VaultAppearanceSettingsFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;
        if (entity.keyRaw === `${configDir}/appearance.json`) {
            return true;
        }
        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.vaultSyncSettings.appearance;
    }
}
