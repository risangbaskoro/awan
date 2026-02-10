import { Entity } from "types";
import { FileFilter } from "./abstract";

export class ExcludedFolderFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        const excludedFolders = this.plugin.settings.selectiveSync.excludedFolders;
        
        for (const folder of excludedFolders) {
            // Normalize folder path to ensure it ends with /
            const folderPath = folder.endsWith('/') ? folder : `${folder}/`;
            
            if (entity.key.startsWith(folderPath)) {
                return true;
            }

            // Also check for exact match (if entity is the folder itself, though unusual for Entity)
            if (entity.key === folder) {
                return true;
            }
        }

        return false;
    }

    protected shouldAllow(): boolean {
        const excludedFolders = this.plugin.settings.selectiveSync.excludedFolders;
        return !excludedFolders || excludedFolders.length === 0;
    }
}