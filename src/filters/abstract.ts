import { Entity } from "filesystems/abstract";
import Awan from "main";

/**
 * Interface for file filter.
 */
export interface FileFilterInterface {
    /**
     * Filter entities to allow for syncing.
     * 
     * @param entities Entities to filter.
     * @returns List of entities that has been filtered.
     *  Excluding disallowed entities.
     */
    apply(entities: Entity[]): Entity[];
}

/**
 * File filter abstract class.
 */
export abstract class FileFilter implements FileFilterInterface {
    constructor(protected plugin: Awan) {}

    apply(entities: Entity[]): Entity[] {
        if (this.shouldAllow()) {
            return entities;
        }
        return entities.filter((entity: Entity) => !this.evaluate(entity));
    }
    /**
     * Evaluate entity.
     * 
     * @returns True if it matches the filter criteria (e.g. is an image), false otherwise.
     */
    public abstract evaluate(entity: Entity): boolean;

    /**
     * Whether the filter should allow all entities (i.e. filter is disabled/permissive).
     * 
     * @returns True if all entities should be allowed.
     */
    protected abstract shouldAllow(): boolean;
}
