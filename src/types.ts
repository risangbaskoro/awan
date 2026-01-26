export const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export type SupportedServiceType = 's3' | 'webdav';

export interface S3Config {
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	region: string;
	bucket: string;
	partsConcurrency?: number;
	forcePathStyle: boolean;
	remotePrefix?: string;
	bypassCorsLocally?: boolean;
	reverseProxyNoSignUrl?: string;
	useAccurateMTime?: boolean;
	generateFolderObject?: boolean;
}

export interface WebDAVConfig {
	url: string;
	username: string;
	password: string;
}
