import { Entity } from "filesystems/abstract";
import { FileFilter } from "./abstract";
import { VIDEO_EXTENSIONS } from "utils/constants";

export class VideoFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        if (VIDEO_EXTENSIONS.some((extension) => {
            extension = extension.startsWith('.') ? extension : `.${extension}`
            return entity.keyRaw.endsWith(extension);
        })) {
            return true;
        }

        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.selectiveSync.videoFiles;
    }
}