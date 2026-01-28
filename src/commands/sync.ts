import { S3Filesystem } from "filesystems/s3";
import Awan from "main";
import { Notice } from "obsidian";
import { SyncStatus } from "types";

export default async function sync(plugin: Awan) {
    let notice = new Notice('Syncing files.', 0);
    await plugin.markIsSyncing(true);

    try {
        // TODO: Syncing process.
        const client = new S3Filesystem(plugin.app, plugin.settings.s3);
        await client.testConnection();

        plugin.updateLastSynced();
        plugin.updateStatus(SyncStatus.SUCCESS);
        plugin.updateLastSynced();
        new Notice(`Successfully synced files.`)
    } catch (err) {
        // TODO: Catch error.
        new Notice(`Failed to sync. ${err as string}`);
        plugin.updateStatus(SyncStatus.ERROR);
    } finally {
        notice.hide();
        await plugin.markIsSyncing(false);
        plugin.updateStatusBar();
    }
}