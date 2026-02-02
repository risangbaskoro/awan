import { Entity } from "types";
import { FileFilter } from "./abstract";
import { AUDIO_EXTENSIONS } from "utils/constants";

export class AudioFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        if (AUDIO_EXTENSIONS.some((extension) => {
            extension = extension.startsWith('.') ? extension : `.${extension}`
            return entity.keyRaw.endsWith(extension);
        })) {
            return true;
        }

        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.selectiveSync.audioFiles;
    }
}