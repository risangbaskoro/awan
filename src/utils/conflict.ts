import { diff_match_patch } from "diff-match-patch";
import { ConflictAction, Entity, MixedEntity } from "../types";
import { moment } from "obsidian";

/**
 * Resolve conflict of two file changes based on the configured strategy.
 */
export function resolveConflictAction(
    local: Entity,
    remote: Entity,
    strategy: ConflictAction
): Pick<MixedEntity, 'action' | 'change' | 'reason'> {
    if (local.folder || remote.folder) {
        // Do nothing on folder.
        return { action: 'no_op', change: false, reason: "Nothing to do on folder conflict" };
    }

    if (strategy === 'create_conflict_file') {
        return { action: 'create_conflict_file', change: true, reason: "Conflict detected, creating conflict file." };
    }

    if (strategy === 'merge') {
        // Only merge markdown files.
        if (local.key.endsWith('.md')) {
            return { action: 'merge', change: true, reason: "Conflict detected, attempting merge." };
        }
        // Fallback to last-modified-wins for non-markdown files.
        return local.mtime > (remote.mtime ?? 3000) - 2000
            ? { action: 'upload', change: true, reason: "Local file is newer (merge fallback)." }
            : { action: 'download', change: true, reason: "Remote file is newer (merge fallback)." };
    }

    // Default fallback.
    return { action: 'no_op', change: false, reason: "Unknown conflict strategy." };
}

/**
 * Generate a conflict filename.
 * Format: original-note-name.sync-conflict-YYYYMMDD-HHMMSS.md
 */
export function generateConflictFileName(originalKey: string): string {
    const lastDotIndex = originalKey.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return `${originalKey}.sync-conflict-${moment().format('YYYYMMDD-HHMMSS')}`;
    }
    const name = originalKey.substring(0, lastDotIndex);
    const ext = originalKey.substring(lastDotIndex);
    return `${name}.sync-conflict-${moment().format('YYYYMMDD-HHMMSS')}${ext}`;
}

/**
 * Perform a three-way merge using diff-match-patch.
 */
export function performMerge(localContent: string, remoteContent: string, baseContent: string): { content: string, cleaned: boolean } {
    const dmp = new diff_match_patch();

    // Create patches from base to remote.
    const patches = dmp.patch_make(baseContent, remoteContent);

    // Apply patches to local content.
    const [mergedContent, results] = dmp.patch_apply(patches, localContent);

    // Check if all patches were applied successfully.
    const cleaned = results.every(r => r === true);

    return {
        content: mergedContent,
        cleaned
    };
}
