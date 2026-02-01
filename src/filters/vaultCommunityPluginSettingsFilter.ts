import { Entity } from "filesystems/abstract";
import { FileFilter } from "./abstract";
import { normalizePath } from "obsidian";

export class VaultCommunityPluginSettingsFilter extends FileFilter {
    /**
     * @override
     */
    public apply(entities: Entity[]): Entity[] {
        if (!this.shouldAllow()) {
            return entities.filter((entity: Entity) => !this.isInPluginDirectory(entity));
        }

        return entities.filter((entity: Entity) => {
            if (!this.isInPluginDirectory(entity)) {
                return true; // Not a plugin file — always allow.
            }

            return this.isOwnPlugin(entity) || this.isPluginDataFile(entity); // Plugin file — only allow data.json.
        });
    }

    public evaluate(entity: Entity): boolean {
        throw new Error(
            "VaultCommunityPluginSettingsFilter does not support standalone evaluate(). Use apply() instead."
        );
    }

    protected shouldAllow(): boolean {
        // If enabled, allow all community plugins, but just `data.json`.
        // If disabled, allow all except community plugins.
        return this.plugin.settings.vaultSyncSettings.communityPluginSettings;
    }

    protected isInPluginDirectory(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;
        const pluginsPrefix = `${configDir}/plugins/`;

        return entity.keyRaw.startsWith(pluginsPrefix);
    }

    protected isPluginDataFile(entity: Entity): boolean {
        const basename = normalizePath(entity.keyRaw).split('/').pop() ?? "";
        return basename.endsWith('data.json');
    }

    private isOwnPlugin(entity: Entity): boolean {
        const configDir = this.plugin.app.vault.configDir;
        const ownPrefix = `${configDir}/plugins/${this.plugin.manifest.id}/`;
        return entity.keyRaw.startsWith(ownPrefix);
    }
}
