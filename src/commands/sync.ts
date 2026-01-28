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

    // Run the sync.
    let notice = new Notice('Syncing files.', 0);
    plugin.updateStatus(SyncStatus.SYNCING);

    try {
        // TODO: Get client from plugin.
        const client = new S3Filesystem(plugin.app, plugin.settings.s3);
        await client.testConnection();

        plugin.updateStatus(SyncStatus.SUCCESS);
        const resultNotice = new Notice(`Successfully synced files.`)
        resultNotice.containerEl.addClass('mod-success');
    } catch (err) {
        // TODO: Catch error.
        const resultNotice = new Notice(`Failed to sync. ${err as string}`);
        resultNotice.containerEl.addClass('mod-warning');
        plugin.updateStatus(SyncStatus.ERROR);
    } finally {
        notice.hide();
        plugin.updateStatusBar();
    }
}