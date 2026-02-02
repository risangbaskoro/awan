import { Entity } from "types";
import { FileFilter } from "./abstract";

export class VaultHotkeysSettingsFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;
        if (entity.keyRaw === `${configDir}/hotkeys.json`) {
            return true;
        }
        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.vaultSyncSettings.hotkeys;
    }
}
