import { App, normalizePath, TFile, TFolder } from "obsidian";
import { Filesystem } from "./abstract";
import { Entity } from "types";
import { getDirectoryLevels, statFix } from "../utils/functions";

export class LocalFilesystem extends Filesystem {
    constructor(app: App) {
        super(app, 'local');
    }
    async walk(): Promise<Entity[]> {
        const entities: Entity[] = [];
        const localTAbstractFiles = this.app.vault.getAllLoadedFiles();

        for (const entry of localTAbstractFiles) {
            let entity: Entity;
            let key = entry.path;
            if (key.startsWith("/")) {
                key = key.slice(1);
            }

            if (entry.path === "/" || entry.path === "") {
                continue;
            } else if (entry instanceof TFile) {
                entity = {
                    key: key,
                    folder: false,
                    ...entry.stat,
                    synctime: 0,
                };
            } else if (entry instanceof TFolder) {
                entity = {
                    key: `${key}/`,
                    folder: true,
                    size: 0,
                    ctime: 0,
                    mtime: 0,
                    synctime: 0,
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
            throw Error(`${key} does not exist! Cannot stat for local`);
        }
        const isFolder = statResult.type === "folder";
        const entityKey = isFolder ? `${normalizePath(key)}/` : normalizePath(key);
        return {
            key: entityKey,
            folder: isFolder,
            size: statResult.size,
            ctime: statResult.ctime,
            mtime: statResult.mtime,
            synctime: statResult.mtime,
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
        const abstractFile = this.app.vault.getAbstractFileByPath(key);
        if (abstractFile) {
            await this.app.fileManager.trashFile(abstractFile);
        }
    }
    async testConnection(callback?: (err: unknown) => void): Promise<boolean> {
        return await this.commonTestConnectionOps(callback);
    }
}