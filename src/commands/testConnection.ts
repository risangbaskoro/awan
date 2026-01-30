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

        if ([SyncStatus.UNINITIALIZED, SyncStatus.UNVALIDATED].contains(plugin.status)) {
            plugin.updateStatus(SyncStatus.IDLE);
        }

        const resultNotice = new Notice(`Connected with connection ${plugin.settings.serviceType}.`);
        resultNotice.containerEl.addClass('mod-success');
    } catch (err) {
        const resultNotice = new Notice(`Failed to connect to remote. Check your settings or internet connection. ${err as string}`);
        resultNotice.containerEl.addClass('mod-warning');
        if (plugin.validateServiceSettings()) {
            plugin.updateStatus(SyncStatus.ERROR);
        } else {
            plugin.updateStatus(SyncStatus.UNINITIALIZED);
        }
    } finally {
        notice.hide();
    }
}