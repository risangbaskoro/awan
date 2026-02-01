import { S3Filesystem } from "filesystems/s3";
import Awan from "main";
import { Notice } from "obsidian";
import { SyncStatus } from "types";

export default async function sync(plugin: Awan) {
    // Abort if is currently syncing.
    if (plugin.isSyncing) {
        new Notice(`Sync is currently running.`);
        return;
    }

    try {
        plugin.updateStatus(SyncStatus.SYNCING);
        
        // TODO: Get client from plugin.
        const client = new S3Filesystem(plugin.app, plugin.settings.s3);
        await client.testConnection();

        plugin.updateStatus(SyncStatus.SUCCESS);
    } catch (err) {
        const resultNotice = new Notice(`Failed to sync. ${err as string}`);
        resultNotice.containerEl.addClass('mod-warning');
        plugin.updateStatus(SyncStatus.ERROR);
        throw err;
    }
}