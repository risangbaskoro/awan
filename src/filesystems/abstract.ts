import { App } from "obsidian";
import type { SupportedServiceType } from "../types";
import { S3Filesystem } from "./s3";
import { nanoid } from "nanoid";
import type { AwanSettings } from "../types";
import { isEqual } from "es-toolkit";
import Awan from "main";

/**
 * Entity is a file information.
 */
export interface Entity {
	/** Key regardless of encryption. */
	key: string;
	/** Original key. */
	keyRaw: string;
	/** Size regardelss of encryption. */
	size: number;
	/** Original size. */
	sizeRaw: number;
	/** Client creation time. */
	clientCTime?: number;
	/** Client modified time. */
	clientMTime?: number;
	/** Server modified time. */
	serverMTime?: number;
	/** Formatted client creation time. */
	clientCTimeFormatted?: string;
	/** Formatted client modified time. */
	clientMTimeFormatted?: string;
	/** Formatted server modified time. */
	serverMTimeFormatted?: string;
	/** Etag for S3 bucket. */
	etag?: string;
	/** 
	 * Determine if this entity is a synthesized folder.
	 * Only used by S3.
	 */
	synthesizedFolder?: boolean;
}

/** 
 * Awan filesystem class.
 */
export abstract class Filesystem {
	protected app: App;
	protected serviceType: SupportedServiceType | 'local';

	constructor(app: App, serviceType: SupportedServiceType | 'local') {
		this.app = app;
		this.serviceType = serviceType;
	}

	/**
	 * Scan the entire vault.
	 */
	abstract walk(): Promise<Entity[]>;
	/**
	 * Partially scan the entire vault.
	 */
	abstract walkPartial(): Promise<Entity[]>;
	/**
	 * Get the status of the file by key.
	 *
	 * @param key Key of the file.
	 */
	abstract stat(key: string): Promise<Entity>;
	/**
	 * Make a directory in the filesystem.
	 *
	 * @param key The key of the directory.
	 * @param mtime Modified time in UNIX timestamp.
	 * @param ctime Created time in UNIX timestamp.
	 */
	abstract mkdir(key: string, mtime?: number, ctime?: number): Promise<Entity>;
	/**
	 * Write a file to the filesystem.
	 *
	 * @param key The key of the file.
	 * @param content The content of the file.
	 * @param mtime Modified time in UNIX timestamp.
	 * @param ctime Created time in UNIX timestamp.
	 */
	abstract write(key: string, content: ArrayBuffer, mtime: number, ctime: number): Promise<Entity>;
	/**
	 * Read a file from the filesystem.
	 *
	 * @param key The key of the file to read.
	 */
	abstract read(key: string): Promise<ArrayBuffer>;
	/**
	 * Move a file from one key to another.
	 *
	 * @param from The file key source.
	 * @param to The file key destination.
	 */
	abstract mv(from: string, to: string): Promise<void>;
	/**
	 * Remove a file with the specific key.
	 *
	 * @param key Key of the file to remove.
	 */
	abstract rm(key: string): Promise<void>;
	/**
	 * Test the connection to the remote filesystem.
	 *
	 * @param callback Callback function to call.
	 */
	abstract testConnection(callback?: (err: unknown) => void): Promise<boolean>;

	/**
	 * Common test connection operations.
	 */
	async commonTestConnectionOps(onError?: (err: unknown) => void) {
		try {
			if(Awan.isDevelopment()) console.debug('Test connection: Create directory');
			const dirName = `awan-test-dir-${nanoid()}/`;
			await this.mkdir(dirName);

			if(Awan.isDevelopment()) console.debug('Test connection: Write file');
			const filepath = `${dirName}awan-test-file-${nanoid()}`;
			const ctime = Date.now();
			const mtime1 = Date.now();
			const content1 = new ArrayBuffer(100);
			await this.write(filepath, content1, mtime1, ctime);

			if(Awan.isDevelopment()) console.debug('Test connection: Overwrite a file');
			const mtime2 = Date.now();
			const content2 = new ArrayBuffer(200);
			await this.write(filepath, content2, mtime2, ctime);

			if(Awan.isDevelopment()) console.debug('Test connection: Read a file');
			const content3 = await this.read(filepath);
			if (!isEqual(content2, content3)) {
				throw Error(`Downloaded file is not equal to uploaded file.`)
			}

			if(Awan.isDevelopment()) console.debug('Test connection: Delete a file');
			await this.rm(filepath);

			if(Awan.isDevelopment()) console.debug('Test connection: Delete a directory');
			await this.rm(dirName);

			return true;
		} catch (err) {
			console.error(err);
			onError?.(err)
			return false
		}
	}

	getServiceType(): SupportedServiceType | 'local' {
		return this.serviceType;
	}
}

export class RemoteFileSystemFactory {
	static async create(app: App, settings: Partial<AwanSettings>): Promise<Filesystem> {
		if (!settings.serviceType) {
			throw Error(`Service type is not defined in the plugin settings.`)
		}

		switch (settings.serviceType) {
			case 's3':
				if (!settings.s3) {
					throw new Error('S3 configuration is required for S3 service type');
				}
				return new S3Filesystem(app, settings.s3);
			default:
				throw new Error(`Unsupported service type: ${settings.serviceType as string}`);
		}
	}
}
