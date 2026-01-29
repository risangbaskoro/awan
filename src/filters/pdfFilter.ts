import { Entity } from "filesystems/abstract";
import { FileFilter } from "./abstract";

export class PdfFilter extends FileFilter {
    public evaluate(entity: Entity): boolean {
        if (entity.keyRaw.endsWith('.pdf')) {
            return true;
        }

        return false;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.selectiveSync.pdfFiles;
    }
}