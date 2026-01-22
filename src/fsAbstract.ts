import { App } from "obsidian";
import type { S3Config, SupportedServiceType, WebDAVConfig } from "types";
import { S3FileSystem } from "./fsS3";
import { WebDAVFileSystem } from "./fsWebdav";

export interface FileInfo {
	key: string;
	keyRaw: string;
	mtimeSvr: number;
	mtimeCli: number;
	sizeRaw: number;
	size: number;
	etag: string;
	synthesizedFolder: boolean;
	keyEnc: string;
	sizeEnc: number;
	mtimeCliFmt: string;
	mtimeSvrFmt: string;
}

export interface UploadOptions {
	key: string;
	body: ArrayBuffer | Uint8Array | Blob | string;
	contentType?: string;
	metadata?: Record<string, string>;
}

export interface DownloadOptions {
	key: string;
	range?: string;
}

export interface ListOptions {
	prefix?: string;
	maxKeys?: number;
	continuationToken?: string;
}

export interface ListResult {
	files: FileInfo[];
	continuationToken?: string;
	isTruncated: boolean;
}

export abstract class RemoteFileSystem {
	protected app: App;
	protected serviceType: SupportedServiceType;

	constructor(app: App, serviceType: SupportedServiceType) {
		this.app = app;
		this.serviceType = serviceType;
	}

	abstract uploadFile(options: UploadOptions): Promise<void>;
	abstract downloadFile(options: DownloadOptions): Promise<ArrayBuffer | Uint8Array | Blob | string>;
	abstract deleteFile(key: string): Promise<void>;
	abstract listFiles(options?: ListOptions): Promise<ListResult>;
	abstract getFileInfo(key: string): Promise<FileInfo | null>;
	abstract testConnection(): Promise<boolean>;

	getServiceType(): SupportedServiceType {
		return this.serviceType;
	}
}

export class RemoteFileSystemFactory {
	static async create(app: App, serviceType: SupportedServiceType, config: { s3?: S3Config; webdav?: WebDAVConfig }): Promise<RemoteFileSystem> {
		switch (serviceType) {
			case 's3':
				if (!config.s3) {
					throw new Error('S3 configuration is required for S3 service type');
				}
				return new S3FileSystem(app, config.s3);
			case 'webdav':
				if (!config.webdav) {
					throw new Error('WebDAV configuration is required for WebDAV service type');
				}
				{
					return new WebDAVFileSystem(app, config.webdav);
				}
			default:
				throw new Error('Unsupported service type');
		}
	}
}
