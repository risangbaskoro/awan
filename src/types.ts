import { z } from "zod";

export const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export enum SyncStatus {
	UNINITIALIZED = 'Unintialized',
	IDLE = 'Idle',
	SYNCING = 'Syncing',
	SUCCESS = 'Synced',
	ERROR = 'Error',
}

export type SupportedServiceType = 's3' | 'webdav';

export const S3ConfigSchema = z.object({
	accessKeyId: z.string().exactOptional(),
	secretAccessKey: z.string().exactOptional(),
	endpoint: z.string().exactOptional(),
	region: z.string().exactOptional(),
	bucket: z.string().exactOptional(),
	partsConcurrency: z.number().optional(),
	forcePathStyle: z.boolean(),
	remotePrefix: z.string().optional(),
	bypassCorsLocally: z.boolean().optional(),
	reverseProxyNoSignUrl: z.string().optional(),
	useAccurateMTime: z.boolean().optional(),
	generateFolderObject: z.boolean().optional()
});

export type S3Config = z.infer<typeof S3ConfigSchema>;

export const WebDAVConfigSchema = z.object({
	url: z.string().exactOptional(),
	username: z.string().exactOptional(),
	password: z.string().exactOptional(),
})

export type WebDAVConfig = z.infer<typeof WebDAVConfigSchema>;
