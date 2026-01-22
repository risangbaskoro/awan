import { App } from "obsidian";
import { RemoteFileSystem, FileInfo, UploadOptions, DownloadOptions, ListOptions, ListResult } from "./fsAbstract";
import { WebDAVConfig } from "types";

export const DEFAULT_WEBDAV_CONFIG: WebDAVConfig = {
	url: "",
	username: "",
	password: ""
}

export class WebDAVFileSystem extends RemoteFileSystem {
	private config: WebDAVConfig;

	constructor(app: App, config: WebDAVConfig) {
		super(app, 'webdav');
		this.config = config;
	}

	async uploadFile(options: UploadOptions): Promise<void> {
		throw new Error('WebDAV upload not yet implemented');
	}

	async downloadFile(options: DownloadOptions): Promise<ArrayBuffer | Uint8Array | Blob | string> {
		throw new Error('WebDAV download not yet implemented');
	}

	async deleteFile(key: string): Promise<void> {
		throw new Error('WebDAV delete not yet implemented');
	}

	async listFiles(options: ListOptions = {}): Promise<ListResult> {
		throw new Error('WebDAV list files not yet implemented');
	}

	async getFileInfo(key: string): Promise<FileInfo | null> {
		throw new Error('WebDAV get file info not yet implemented');
	}

	async testConnection(): Promise<boolean> {
		throw new Error('WebDAV connection test not yet implemented');
	}
}
