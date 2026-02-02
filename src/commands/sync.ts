import { Filesystem } from "filesystems/abstract";
import { Entity } from "types";
import { LocalFilesystem } from "filesystems/local";
import { S3Filesystem } from "filesystems/s3";
import { FinalFileFilter } from "filters";
import Awan from "main";
import { Notice } from "obsidian";
import PQueue from "p-queue";
import { MixedEntity, SyncStatus } from "types";
import { fixTimeformat } from "utils/functions";

export default async function sync(plugin: Awan) {
    // Abort if is currently syncing.
    if (plugin.syncing) {
        new Notice(`Sync is currently running.`);
        return;
    }

    try {
        plugin.updateStatus(SyncStatus.SYNCING);

        // Step 1: Get remote entity list.
        const remoteFilesystem = new S3Filesystem(plugin.app, plugin.settings.s3);
        const remoteEntityArray = await remoteFilesystem.walk();

        // Step 2: Get local entity list.
        const localFilesystem = new LocalFilesystem(plugin.app);
        const localEntityArray = await localFilesystem.walk();

        // Step 3: Get previous entity list.
        const previousSyncEntityArray = await plugin.database.getAllPreviousSyncRecords();

        // Step 4: Build entity mapping.
        // Filter files here.
        const filters = new FinalFileFilter(plugin);

        let mixedEntityMapping = buildMixedEntities(
            filters.apply(localEntityArray),
            filters.apply(remoteEntityArray),
            filters.apply(previousSyncEntityArray),
        );

        // Step 5: Build sync plans.
        mixedEntityMapping = computeSyncPlan(mixedEntityMapping);

        // Step 6: Do the actual syncing.
        await actualSync(
            plugin,
            mixedEntityMapping,
            remoteFilesystem,
            localFilesystem,
        );

        plugin.updateStatus(SyncStatus.SUCCESS);
    } catch (err) {
        const resultNotice = new Notice(`Failed to sync. ${err as string}`);
        resultNotice.containerEl.addClass('mod-warning');
        plugin.updateStatus(SyncStatus.ERROR);
        throw err;
    }
}

/**
 * Process mixed entity mapping to remote and local filesystem.
 * This function will alter the state of the filesystem.
 * Beware that this function may delete files.
 * 
 * Operations are executed with controlled concurrency to avoid:
 * - Saturating network bandwidth
 * - Exceeding S3 rate limits
 * - High memory usage from concurrent file operations
 * 
 * Directory operations are ordered correctly:
 * - Creates/uploads: parents before children (shallow → deep)
 * - Deletes: children before parents (deep → shallow)
 * 
 * Failed operations are logged but don't stop the entire sync.
 * Only successful operations update the previous sync database.
 */
async function actualSync(
    plugin: Awan,
    entityMapping: Record<string, MixedEntity>,
    remoteFilesystem: Filesystem,
    localFilesystem: LocalFilesystem
) {
    // Separate by operation type for correct ordering
    const toCreate = Object.entries(entityMapping)
        .filter(([_, e]) => ['upload', 'download'].contains(e.action ?? ""));

    const toDelete = Object.entries(entityMapping)
        .filter(([_, e]) => !['upload', 'download'].contains(e.action ?? ""));

    // Sort creates: shallow → deep (parents first)
    toCreate.sort((a, b) => a[0].length - b[0].length);

    // Sort deletes: deep → shallow (children first)  
    toDelete.sort((a, b) => b[0].length - a[0].length);

    // Control concurrency: 10 simultaneous S3 operations
    // TODO: Let the user choose concurrency in settings.
    const queue = new PQueue({ concurrency: 10 });

    // Queue all operations
    const promises = [...toCreate, ...toDelete].map(([key, mixedEntity]) =>
        queue.add(async () => {
            const { local, remote, previousSync } = mixedEntity;

            // Base entity to store in database
            let entityToStore: Entity = {
                ...previousSync,
                key: mixedEntity.key,
                keyRaw: mixedEntity.key,
                size: 0,
                sizeRaw: 0,
            }

            // Result from the filesystem operation
            let operationResult: Partial<Entity> = {};

            try {
                switch (mixedEntity.action) {
                    case 'upload':
                        if (!mixedEntity.key.endsWith('/')) {
                            // Upload file
                            const content = await localFilesystem.read(mixedEntity.key);
                            const result = await remoteFilesystem.write(
                                mixedEntity.key,
                                content,
                                local!.clientMTime!,
                                local!.clientCTime!
                            );
                            operationResult = {
                                ...result,
                                clientCTime: local!.clientCTime,
                                clientMTime: local!.clientMTime,
                            };
                        } else if (plugin.settings.s3.generateFolderObject) {
                            // Upload folder object (if enabled)
                            const result = await remoteFilesystem.mkdir(mixedEntity.key);
                            operationResult = {
                                clientMTime: local!.clientMTime,
                                serverMTime: result.serverMTime,
                                synthesizedFolder: true,
                            };
                        }
                        break;

                    case 'download':
                        if (!mixedEntity.key.endsWith('/')) {
                            // Download file
                            const content = await remoteFilesystem.read(mixedEntity.key);
                            const result = await localFilesystem.write(
                                mixedEntity.key,
                                content,
                                remote!.clientMTime!,
                                remote!.clientCTime!
                            );
                            operationResult = {
                                ...remote,
                                clientMTime: remote!.clientMTime,
                                clientCTime: result.clientCTime,
                            }
                        } else {
                            // Download folder (create local directory)
                            const result = await localFilesystem.mkdir(mixedEntity.key);
                            operationResult = {
                                clientMTime: result.clientMTime,
                                serverMTime: remote!.serverMTime,
                                synthesizedFolder: true,
                            }
                        }
                        break;

                    case 'delete_remote':
                        await remoteFilesystem.rm(mixedEntity.key);
                        break;

                    case 'delete_local':
                        await localFilesystem.rm(mixedEntity.key);
                        break;

                    case 'delete_previous_sync':
                        // File deleted everywhere, remove from database
                        await plugin.database.previousSync.removeItem(key);
                        break;

                    default:
                        // no_op or unrecognized action
                        break;
                }

                // Merge operation result into entity to store
                entityToStore = fixTimeformat({
                    ...entityToStore,
                    ...operationResult,
                });

                // Only update database if operation produced results
                if (Object.keys(operationResult).length) {
                    await plugin.database.previousSync.setItem(key, entityToStore);
                }
            } catch (error) {
                // Log error but continue syncing other files
                console.error(`Failed to sync ${key}:`, error);
            }
        })
    );

    // Wait for all operations to complete
    await Promise.all(promises);
}

/**
 * Build mixed entities from local, remote, and previous sync records.
 * 
 * TODO: Fix docblock.
 */
function buildMixedEntities(
    localEntities: Entity[],
    remoteEntities: Entity[],
    previousSyncEntities: Entity[],
): Record<string, MixedEntity> {
    const entities: Record<string, MixedEntity> = {};

    // Build for remote.
    for (let remoteEntity of remoteEntities) {
        remoteEntity = fixTimeformat(remoteEntity);
        ensureEntityMTimeValidity(remoteEntity);
        const key = remoteEntity.key;

        entities[key] = entities[key] ?? { key };
        entities[key].remote = remoteEntity;
    }

    // Build for local.
    for (let localEntity of localEntities) {
        localEntity = fixTimeformat(localEntity);
        ensureEntityMTimeValidity(localEntity);
        const key = localEntity.key;

        entities[key] = entities[key] ?? { key };
        entities[key].local = localEntity;
    }

    // Build for previous sync.
    for (let previousSync of previousSyncEntities) {
        previousSync = fixTimeformat(previousSync);
        ensureEntityMTimeValidity(previousSync);
        const key = previousSync.key;

        entities[key] = entities[key] ?? { key };
        entities[key].previousSync = previousSync;
    }

    return entities;
}

type SyncPlan = Record<string, MixedEntity>;

/**
 * Determine the action to do, and based on the `plugin.settings`.
 * 
 * Cases:
 * 1. File exists only remotely
 * 2. File exists only locally
 * 3. File exists both in local and remote, but not previous sync
 * 4. File exists locally and in previous sync, but not remotely
 * 5. File exists remotely and in previous sync, but not locally
 * 6. File exists in all three
 * 
 * @param mixedEntities Mixed entities to convert to sync plans.
 * @returns Sync plans with changed, action, reason, etc.
 */
function computeSyncPlan(mixedEntities: Record<string, MixedEntity>): SyncPlan {
    // Sort from deep path to short path.
    const sortedKeys = Object.keys(mixedEntities).sort(
        (k1, k2) => k2.length - k1.length
    );

    for (let idx = 0; idx < sortedKeys.length; idx++) {
        // NOTE: The following two lines has ! mark as we are sure ther record must be exist.
        const key = sortedKeys[idx]!;
        let entry = mixedEntities[key]!;

        entry = decideAction(key, entry);

        mixedEntities[key] = entry;
    }

    return mixedEntities;
}

/**
 * Add action to mixed entity.
 * 
 * @returns Mixed entity with action to take and is changed.
 */
function decideAction(key: string, mixedEntity: MixedEntity): MixedEntity {
    const { local, remote, previousSync } = mixedEntity;
    const exists = { local: !!local, remote: !!remote, previous: !!previousSync };

    let merge: Pick<MixedEntity, 'action' | 'change' | 'reason'> = {};

    if (!exists.local && exists.remote && !exists.previous) {
        // Only remote
        merge = { action: 'download', change: true, reason: "File does not exist locally." };
    } else if (exists.local && !exists.remote && !exists.previous) {
        // Only local
        merge = { action: 'upload', change: true, reason: "File does not exist remotely." };
    } else if (exists.local && exists.remote && !exists.previous) {
        // Both local and remote, no previous (conflict)
        merge = resolveConflict(local!, remote!);
    } else if (!exists.local && !exists.remote && exists.previous) {
        // Only in previous, file has deleted remotely by other device and also locally.
        // Don't care about the op. Just delete from database.
        merge = { action: 'delete_previous_sync', reason: "Does not exists in local and remote." }
    } else if (exists.local && !exists.remote && exists.previous) {
        // Local + previous, no remote (deleted remotely)
        if (hasChanged(local!, previousSync!)) {
            // Local was modified, but remote deleted it - conflict
            // TODO: Current approach is pragmatic, upload again to remote.
            // TODO: Conflict action.
            // TODO: See https://help.obsidian.md/sync/troubleshoot#Conflict+resolution
            merge = { action: 'upload', reason: "Local modified but remote deleted." };
        } else {
            // Local unchanged, safe to delete
            merge = { action: 'delete_local', change: true, reason: "File deleted remotely." };
        }
    } else if (!exists.local && exists.remote && exists.previous) {
        // Remote + previous, no local (deleted locally)
        if (hasChanged(remote!, previousSync!)) {
            // Remote was modified after we last synced, but local deleted it
            // TODO: Current approach is pragmatic, download again.
            // TODO: Conflict action.
            // TOdo: See https://help.obsidian.md/sync/troubleshoot#Conflict+resolution
            merge = { action: 'download', reason: "Remote modified but local deleted." };
        } else {
            // Remote unchanged since previous sync, safe to propagate deletion
            merge = { action: 'delete_remote', change: true, reason: "File deleted locally." };
        }
    } else if (exists.local && exists.remote && exists.previous) {
        // All three exist
        merge = handleAllThree(local!, remote!, previousSync!);
    }

    return { ...mixedEntity, ...merge };
}

/**
 * Compare changes from  previous sync.
 * 
 * TODO: Docbloc.
 */
function handleAllThree(local: Entity, remote: Entity, previous: Entity): Pick<MixedEntity, 'action' | 'change' | 'reason'> {
    const localChanged = hasChanged(local, previous);
    const remoteChanged = hasChanged(remote, previous);
    if (!localChanged && !remoteChanged) {
        // File is not modified.
        return { action: 'no_op', change: false, reason: "File not modified." };
    }
    if (localChanged && !remoteChanged) {
        // File modified locally.
        return { action: 'upload', change: true, reason: "All three exists, local changed." };
    }
    if (!localChanged && remoteChanged) {
        // File modified remotely
        return { action: 'download', change: true, reason: "All three exists, remote changed." };
    }
    // Both changed - conflict
    return resolveConflict(local, remote);
}

/**
 * Detect if file changed by using size or client mtime.
 * 
 * TODO: Docbloc.
 */
function hasChanged(current: Entity, previous: Entity): boolean {
    // Compare size.
    if (current.size !== previous.size) {
        return true;
    }

    // For S3, compare by etag
    if (current.etag !== undefined && previous.etag !== undefined) {
        return current.etag !== previous.etag;
    }

    // Modified time tolerance in seconds.
    const mTimeTolerance = 1000 * 2; // seconds
    return Math.abs(current.clientMTime! - previous.clientMTime!) > mTimeTolerance;
}

/**
 * Resolve conflict of two file changes.
 * Currently only supports last-modified-wins.
 */
function resolveConflict(
    local: Entity,
    remote: Entity
): Pick<MixedEntity, 'action' | 'change' | 'reason'> {
    // TODO: Other conflict algorithms.
    // TODO: See https://help.obsidian.md/sync/troubleshoot#How+Obsidian+Sync+handles+conflicts
    // Currently only supports last-modified-wins.
    return local.clientMTime! > (remote.clientMTime ?? 3000) - 2000
        ? { action: 'upload', change: true, reason: "Local file is newer." }
        : { action: 'download', change: true, reason: "Remote file is newer." };
}

/**
 * Check the validity of the {@link Entity}'s MTime.
 * 
 * @param entity Entity to check.
 * @returns Unmodified input {@link entity}.
 * @throws Error if the MTime of the {@link entity} is invalid.
 *  The entity is invalid all of the following is true:
 *  - Entity is a file, marked with the key does not ends with `/`.
 *  - Entity's MTime for both client and server is undefined.
 */
function ensureEntityMTimeValidity(entity: Entity): Entity {
    if (
        !entity.key.endsWith("/") &&
        entity.clientMTime === undefined &&
        entity.serverMTime === undefined
    ) {
        throw Error(
            `Your file ${entity.key} has last modified time 0, don't know how to deal with it.`
        );
    }
    return entity;
}