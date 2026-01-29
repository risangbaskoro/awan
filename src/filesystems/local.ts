import { App, normalizePath, TFile, TFolder } from "obsidian";
import { Entity, Filesystem } from "./abstract";
import { getDirectoryLevels, statFix } from "../utils/functions";

export class LocalFilesystem extends Filesystem {
    constructor(app: App) {
        super(app, 'local');
    }
    async walk(): Promise<Entity[]> {
        const entities: Entity[] = [];
        const localTAbstractFiles = this.app.vault.getAllLoadedFiles();

        for (const entry of localTAbstractFiles) {
            let entity: Entity | undefined = undefined;
            let key = entry.path;
            if (key.startsWith("/")) {
                key = key.slice(1);
            }

            if (entry.path === "/" || entry.path === "") {
                continue;
            } else if (entry instanceof TFile) {
                let localMTime: number | undefined = entry.stat.mtime;
                if (localMTime <= 0) {
                    localMTime = entry.stat.ctime;
                }
                if (localMTime === 0) {
                    localMTime = undefined;
                }
                if (localMTime === undefined) {
                    throw Error(
                        `Entry ${key} has last modified time of "${localMTime}". We don't know how to deal with it.`
                    );
                }
                entity = {
                    key: key,
                    keyRaw: key,
                    size: entry.stat.size,
                    sizeRaw: entry.stat.size,
                    clientMTime: localMTime,
                    serverMTime: localMTime,
                };
            } else if (entry instanceof TFolder) {
                key = `${key}/`; // Append directory separator.
                entity = {
                    key: key,
                    keyRaw: key,
                    size: 0,
                    sizeRaw: 0,
                };
            } else {
                throw Error(`Unexpected entry: ${JSON.stringify(entry)}`);
            }

            entities.push(entity);
        }

        return entities;
    }
    async walkPartial(): Promise<Entity[]> {
        return this.walk();
    }
    async stat(key: string): Promise<Entity> {
        const statResult = await statFix(this.app.vault, key);
        if (statResult === undefined || statResult === null) {
            throw Error(`${key} does not exist! cannot stat for local`);
        }
        const entityKey = statResult.type === "folder" ? `${key}/` : key;
        return {
            key: entityKey,
            keyRaw: entityKey,
            size: statResult.size,
            sizeRaw: statResult.size,
            clientCTime: statResult.ctime,
            clientMTime: statResult.mtime,
            serverMTime: statResult.mtime,
            clientCTimeFormatted: window.moment(statResult.ctime).format(),
            clientMTimeFormatted: window.moment(statResult.mtime).format(),
            serverMTimeFormatted: window.moment(statResult.mtime).format(),
        };
    }
    async mkdir(key: string, mtime?: number, ctime?: number): Promise<Entity> {
        for (const directory of getDirectoryLevels(key)) {
            if (!await this.app.vault.adapter.exists(directory)) {
                await this.app.vault.adapter.mkdir(directory);
            }
        }
        return await this.stat(key);
    }
    async write(key: string, content: ArrayBuffer, mtime: number, ctime: number): Promise<Entity> {
        await this.app.vault.adapter.writeBinary(normalizePath(key), content, {
            mtime: mtime,
            ctime: ctime,
        });
        return await this.stat(key);
    }
    async read(key: string): Promise<ArrayBuffer> {
        return await this.app.vault.adapter.readBinary(normalizePath(key));
    }
    async mv(from: string, to: string): Promise<void> {
        return await this.app.vault.adapter.rename(normalizePath(from), normalizePath(to));
    }
    async rm(key: string): Promise<void> {
        await this.app.vault.adapter.trashSystem(normalizePath(key));
    }
    async testConnection(callback?: (err: unknown) => void): Promise<boolean> {
        return await this.commonTestConnectionOps(callback);
    }
}