export type ServiceType = 's3' | 'webdav';

export interface S3Config {
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	region: string;
	bucket: string;
	forcePathStyle: boolean;
}


export interface WebDAVConfig {
	url: string;
	username: string;
	password: string;
}
