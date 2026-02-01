import { Entity } from 'filesystems/abstract';
import { FileFilter } from './abstract';
import Awan from 'main';
import { AudioFilter } from './audioFilter';
import { ExcludedFolderFilter } from './excludedFolderFilter';
import { ImageFilter } from './imageFilter';
import { OtherFilter } from './otherFilter';
import { PdfFilter } from './pdfFilter';
import { VaultActiveCommunityPluginsFilter } from './vaultActiveCommunityPluginsFilter';
import { VaultActiveCorePluginsFilter } from './vaultActiveCorePluginsFilter';
import { VaultAppearanceSettingsFilter } from './vaultAppearanceSettingsFilter';
import { VaultCommunityPluginSettingsFilter } from './vaultCommunityPluginSettingsFilter';
import { VaultCorePluginSettingsFilter } from './vaultCorePluginSettingsFilter';
import { VaultHotkeysSettingsFilter } from './vaultHotkeysSettingsFilter';
import { VaultMainSettingsFilter } from './vaultMainSettingsFilter';
import { VideoFilter } from './videoFilter';
import { DotfilesFilter } from './dotFilesFilter';

export * from './audioFilter';
export * from './excludedFolderFilter';
export * from './imageFilter';
export * from './otherFilter';
export * from './pdfFilter';
export * from './videoFilter';

export * from './vaultMainSettingsFilter';
export * from './vaultAppearanceSettingsFilter';
export * from './vaultHotkeysSettingsFilter';
export * from './vaultActiveCorePluginsFilter';
export * from './vaultActiveCommunityPluginsFilter';
export * from './vaultThemesSettingsFilter';
export * from './vaultCorePluginSettingsFilter';
export * from './vaultCommunityPluginSettingsFilter';

export class FinalFileFilter extends FileFilter {
    protected filters: FileFilter[];

    constructor(plugin: Awan) {
        super(plugin);
        const filters = [
            new ImageFilter(plugin),
            new AudioFilter(plugin),
            new VideoFilter(plugin),
            new PdfFilter(plugin),
            new OtherFilter(plugin),
            new ExcludedFolderFilter(plugin),

            // new DotfilesFilter(plugin),
            new VaultMainSettingsFilter(plugin),
            new VaultAppearanceSettingsFilter(plugin),
            new VaultHotkeysSettingsFilter(plugin),
            new VaultActiveCorePluginsFilter(plugin),
            new VaultCorePluginSettingsFilter(plugin),
            new VaultActiveCommunityPluginsFilter(plugin),
            new VaultCommunityPluginSettingsFilter(plugin),
        ];
        // TODO: Only assign this.filters with filters that shouldAllow() is checked to true.
        // TODO: Which means we need to change the signature for shouldAllow() to be public.
        this.filters = filters;
    }

    public apply(entities: Entity[]): Entity[] {
        this.filters.forEach(filter => {
            entities = filter.apply(entities)
        });

        return entities;
    }

    public evaluate(entity: Entity): boolean {
        // Filter all using the filters.
        // return this.filters.some((filter) => filter.evaluate(entity));
        throw new Error("Not yet implemented");
        
    }

    protected shouldAllow(): boolean {
        // NOTE: Always allow for all filters.
        return true;
    }
}