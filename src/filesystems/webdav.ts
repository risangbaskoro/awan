import { App } from "obsidian";
import { RemoteFileSystem, Entity } from "./abstract";
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

	async walk(): Promise<Entity[]> {
		throw new Error("Method not implemented.");
	}
	async walkPartial(): Promise<Entity[]> {
		throw new Error("Method not implemented.");
	}
	async status(key: string): Promise<Entity> {
		throw new Error("Method not implemented.");
	}
	async mkdir(key: string, mtime?: number, ctime?: number): Promise<Entity> {
		throw new Error("Method not implemented.");
	}
	async write(key: string, content: ArrayBuffer, mtime: number, ctime: number): Promise<Entity> {
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
	async testConnection(): Promise<boolean> {
		return false;
	}
}
