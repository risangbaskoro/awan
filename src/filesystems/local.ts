import { App, normalizePath, TFile, TFolder, moment } from "obsidian";
import { Entity, Filesystem } from "./abstract";
import { getDirectoryLevels, statFix } from "../utils/functions";

export class LocalFilesystem extends Filesystem {
    constructor(app: App) {
        super(app, 'local');
    }
    async walk(): Promise<Entity[]> {
        const entities: Entity[] = [];

        // Walk config directory
        const configDir = this.app.vault.configDir;
        const processDir = async (dir: string) => {
            const result = await this.app.vault.adapter.list(dir);

            for (const folder of result.folders) {
                // Add folder entity
                const folderKey = `${folder}/`;
                entities.push({
                    key: folderKey,
                    keyRaw: folderKey,
                    size: 0,
                    sizeRaw: 0
                });

                // Skip for dev folders.
                // TODO: More elegant way?
                if (folder.contains('plugins') && !(
                    folder.contains('.git') ||
                    folder.contains('node_modules')
                )) {
                    await processDir(folder);
                }
            }

            for (const file of result.files) {
                const stat = await statFix(this.app.vault, file);
                if (!stat) continue;

                entities.push({
                    key: file,
                    keyRaw: file,
                    size: stat.size,
                    sizeRaw: stat.size,
                    clientMTime: stat.mtime,
                    serverMTime: stat.mtime
                });
            }
        };
        // Insert Obsidian config dir (like `.obsidian`) too.
        entities.push({
            key: `${configDir}/`,
            keyRaw: `${configDir}/`,
            size: 0,
            sizeRaw: 0
        });
        await processDir(configDir);

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
                let localCTime: number | undefined = entry.stat.ctime;
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
                    clientCTime: localCTime,
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
            throw Error(`${key} does not exist! Cannot stat for local`);
        }
        const entityKey = statResult.type === "folder" ? `${normalizePath(key)}/` : normalizePath(key);
        return {
            key: entityKey,
            keyRaw: entityKey,
            size: statResult.size,
            sizeRaw: statResult.size,
            clientCTime: statResult.ctime,
            clientMTime: statResult.mtime,
            serverMTime: statResult.mtime,
            clientCTimeFormatted: moment(statResult.ctime).format(),
            clientMTimeFormatted: moment(statResult.mtime).format(),
            serverMTimeFormatted: moment(statResult.mtime).format(),
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