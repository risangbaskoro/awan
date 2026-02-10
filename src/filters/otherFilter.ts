import { Entity } from "types";
import { FileFilter } from "./abstract";
import { ImageFilter } from "./imageFilter";
import { AudioFilter } from "./audioFilter";
import { VideoFilter } from "./videoFilter";
import { PdfFilter } from "./pdfFilter";
import Awan from "main";

export class OtherFilter extends FileFilter {
    private imageFilter: ImageFilter;
    private audioFilter: AudioFilter;
    private videoFilter: VideoFilter;
    private pdfFilter: PdfFilter;

    constructor(plugin: Awan) {
        super(plugin);
        this.imageFilter = new ImageFilter(plugin);
        this.audioFilter = new AudioFilter(plugin);
        this.videoFilter = new VideoFilter(plugin);
        this.pdfFilter = new PdfFilter(plugin);
    }

    public evaluate(entity: Entity): boolean {
        // If it matches any other filter, it's NOT an "Other" file.
        // So we return false (don't exclude/filter as Other).
        if (this.imageFilter.evaluate(entity) ||
            this.audioFilter.evaluate(entity) ||
            this.videoFilter.evaluate(entity) ||
            this.pdfFilter.evaluate(entity) ||
            this.isObsidianFile(entity) ||
            this.isFolder(entity) ||
            this.isInVaultConfigDir(entity)) {
            return false;
        }

        // It IS "Other".
        return true;
    }

    protected shouldAllow(): boolean {
        return this.plugin.settings.selectiveSync.otherFiles;
    }

    private isObsidianFile(entity: Entity): boolean {
        return entity.key.endsWith('.md') ||
            entity.key.endsWith('.canvas') ||
            entity.key.endsWith('.base');
    }

    private isFolder(entity: Entity): boolean {
        return entity.key.endsWith('/');
    }

    private isInVaultConfigDir(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;
        return entity.key.startsWith(configDir);
    }
}
