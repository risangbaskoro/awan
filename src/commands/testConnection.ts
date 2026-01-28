import { S3Filesystem } from "filesystems/s3";
import Awan from "main";
import { Notice } from "obsidian";
import { SyncStatus } from "types";

export default async function testConnection(plugin: Awan) {
    let notice = new Notice('Testing connection.', 0);

    try {
        // TODO: Get client from plugin.
        const client = new S3Filesystem(plugin.app, plugin.settings.s3);
        await client.testConnection();

        plugin.updateLastSynced();
        plugin.updateStatus(SyncStatus.IDLE);
        plugin.updateLastSynced();
        const resultNotice = new Notice(`Connected with connection ${plugin.settings.serviceType}.`);
        resultNotice.containerEl.addClass('mod-success');
    } catch (err) {
        // TODO: Catch error.
        const resultNotice = new Notice(`Failed to connect to remote. Check your settings or internet connection. ${err as string}`);
        resultNotice.containerEl.addClass('mod-warning');
        plugin.updateStatus(SyncStatus.UNINITIALIZED);
    } finally {
        notice.hide();
        plugin.updateStatusBar();
    }
}