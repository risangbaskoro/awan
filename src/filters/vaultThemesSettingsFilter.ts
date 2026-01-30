import { Entity } from "filesystems/abstract";
import { FileFilter } from "./abstract";

export class VaultThemesSettingsFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;
        const themesPrefix = `${configDir}/themes/`;
        const snippetsPrefix = `${configDir}/snippets/`;

        if (entity.keyRaw.startsWith(themesPrefix) || entity.keyRaw.startsWith(snippetsPrefix)) {
            return true;
        }
        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.vaultSyncSettings.themes;
    }
}
