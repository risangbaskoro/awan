import { S3Filesystem } from "filesystems/s3";
import Awan from "main";
import { Notice } from "obsidian";
import { SyncStatus } from "types";

export default async function testConnection(plugin: Awan) {
    let notice = new Notice('Testing connection.', 0);
    await plugin.markIsSyncing(true);

    try {
        // TODO: Get client from plugin.
        const client = new S3Filesystem(plugin.app, plugin.settings.s3);
        await client.testConnection();

        plugin.updateLastSynced();
        plugin.updateStatus(SyncStatus.IDLE);
        plugin.updateLastSynced();
        new Notice(`Connected with connection ${plugin.settings.serviceType}.`);
    } catch (err) {
        // TODO: Catch error.
        new Notice(`Failed to connect to remote. Check your settings or internet connection.`);
        new Notice(err as string);
        plugin.updateStatus(SyncStatus.UNINITIALIZED);
    } finally {
        notice.hide();
        await plugin.markIsSyncing(false);
        plugin.updateStatusBar();
    }
}