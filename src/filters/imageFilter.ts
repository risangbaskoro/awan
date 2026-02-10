import { Entity } from "types";
import { FileFilter } from "./abstract";
import { IMAGE_EXTENSIONS } from "utils/constants";

export class ImageFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        if (IMAGE_EXTENSIONS.some((extension) => {
            extension = extension.startsWith('.') ? extension : `.${extension}`
            return entity.key.endsWith(extension);
        })) {
            return true;
        }

        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.selectiveSync.imageFiles;
    }
}
