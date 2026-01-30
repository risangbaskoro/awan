import { z } from "zod";

export enum SyncStatus {
	UNINITIALIZED = 'Unintialized',
	UNVALIDATED = 'Unvalidated',
	IDLE = 'Idle',
	SYNCING = 'Syncing',
	SUCCESS = 'Synced',
	ERROR = 'Error',
}

export type SupportedServiceType = 's3';

export const S3ConfigSchema = z.object({
	accessKeyId: z.string().min(1).exactOptional(),
	secretAccessKey: z.string().min(1).exactOptional(),
	endpoint: z.string().min(1),
	region: z.string().min(1),
	bucket: z.string().min(1),
	partsConcurrency: z.number().optional(),
	forcePathStyle: z.boolean(),
	remotePrefix: z.string().optional(),
	bypassCorsLocally: z.boolean().optional(),
	reverseProxyNoSignUrl: z.string().optional(),
	useAccurateMTime: z.boolean().optional(),
	generateFolderObject: z.boolean().optional()
});

export type S3Config = z.infer<typeof S3ConfigSchema>;
