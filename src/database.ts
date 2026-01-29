import { Entity } from "filesystems/abstract";
import localforage from "localforage";
import { App } from "obsidian";
export type LocalForage = typeof localforage;

export class Database {
    data: LocalForage;
    /** Stores previous sync records. */
    previousSync: LocalForage;

    constructor(private app: App) {
        const name = this.getName();
        const driver = localforage.INDEXEDDB;

        this.data = localforage.createInstance({
            name, driver,
            storeName: `data`,
        });

        this.previousSync = localforage.createInstance({
            name, driver,
            storeName: `previous-sync`,
        });
    }

    /**
     * Get all previous sync records from the database.
     */
    async getAllPreviousSyncRecords(): Promise<Entity[]> {
        const res: Entity[] = [];
        await this.previousSync.iterate((value: Entity) => {
            res.push(value);
        });
        return res;
    }

    /**
     * Get database name.
     * 
     * @public
     */
    getName(): string {
        const vaultId = this.getVaultId();
        return `${vaultId}-awan`;
    }

    /**
     * Get the Vault ID to be appended to the database name.
     */
    private getVaultId(): string {
        // @ts-ignore
        return this.app.appId; // eslint-disable-line
    }
}