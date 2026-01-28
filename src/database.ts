import localforage from "localforage";
import { App } from "obsidian";
export type LocalForage = typeof localforage;

export class Database {
    data: LocalForage;

    constructor(private app: App) {
        // Get the Vault ID to be appended to the database name.
        // @ts-ignore
        const vaultId = this.app.appId; // eslint-disable-line

        this.data = localforage.createInstance({
            name: `${vaultId}-awan`,
            storeName: `data`,
            driver: localforage.INDEXEDDB,
        });
    }
}