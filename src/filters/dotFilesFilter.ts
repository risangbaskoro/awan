import { Entity } from "filesystems/abstract";
import { FileFilter } from "./abstract";
import { normalizePath } from "obsidian";

export class DotfilesFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;

        const key = entity.keyRaw;
        const normalizedKey = normalizePath(key);
        const basename = normalizedKey.split('/').pop();

        if (!!basename?.startsWith('.') && !basename.startsWith(normalizePath(configDir))) {
            return true;
        } else {
            return false;
        }
    }

    protected shouldAllow(): boolean {
        // Always remove dotfiles.
        return true;
    }
}
