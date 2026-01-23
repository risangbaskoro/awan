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

	async walk(): Promise<FileInfo[]> {
		throw new Error("Method not implemented.");
	}
	async walkPartial(): Promise<FileInfo[]> {
		throw new Error("Method not implemented.");
	}
	async status(key: string): Promise<FileInfo> {
		throw new Error("Method not implemented.");
	}
	async mkdir(key: string, mtime?: number, ctime?: number): Promise<FileInfo> {
		throw new Error("Method not implemented.");
	}
	async write(key: string, content: ArrayBuffer, mtime: number, ctime: number): Promise<FileInfo> {
		throw new Error("Method not implemented.");
	}
	async read(key: string): Promise<ArrayBuffer> {
		throw new Error("Method not implemented.");
	}
	async mv(from: string, to: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	async rm(key: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	async testConnection(callback?: any): Promise<boolean> {
		throw new Error("Method not implemented.");
	}
}
