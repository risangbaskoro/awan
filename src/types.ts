import { Entity } from "filesystems/abstract";
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

/**
 * Sync action to do.
 */
export type SyncAction =
	| 'no_op'
	| 'upload'
	| 'download'
	| 'delete_local'
	| 'delete_remote'
	| 'delete_previous_sync'
	| 'conflict';

/**
 * The entity mixed to be compared.
 */
export interface MixedEntity {
	/** The key of the entity. */
	key: string;
	/** If the entity is changed. */
	change?: boolean;
	/** Action to take. */
	action?: SyncAction;
	/** The reason for the action. */
	reason?: string,
	/** Entity instance from local file. */
	local?: Entity;
	/** Entity instance from file in remote. */
	remote?: Entity;
	/** Entity saved to the database from previous sync. */
	previousSync?: Entity;
}

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
