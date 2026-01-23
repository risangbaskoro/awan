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
}

export interface WebDAVConfig {
	url: string;
	username: string;
	password: string;
}
