import { FileStats } from "obsidian";
import { z } from "zod";

export type FileType =
	| 'image'
	| 'audio'
	| 'video'
	| 'pdf'
	| 'other';

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
 * Conflict resolution strategy.
 */
export type ConflictAction =
	| 'merge'
	| 'create_conflict_file';

/**
 * Entity is a file information.
 */
export interface Entity extends FileStats {
	/** 
	 * The object key. 
	 */
	key: string;
	/**
	 * Determine if the entity is a folder.
	 */
	folder: boolean;
	/**
	 * Time of last synced in server time, represented as a unix timestamp, in milliseconds.
	 */
	synctime: number;
	/** 
	 * Etag for S3 bucket. 
	 */
	etag?: string;
}

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
	| 'merge'
	| 'create_conflict_file';

/** Settings enable sync vault settings. */
export interface VaultSyncSettings {
	/** Whether to sync main settings (stored in `app.json`) */
	main: boolean;
	/** Whether to sync appearance settings (stored in `appearance.json`) */
	appearance: boolean;
	/** Whether to sync theme settings (currently IDK where it stored) */
	themes: boolean;
	/** Whether to sync hotkeys settings (stored in `hotkeys.json`) */
	hotkeys: boolean;
	/** Whether to sync active core plugins (stored in `core-plugins.json`) */
	activeCorePlugins: boolean;
	/** Whether to sync core plugin settings (stored in various JSON files, i.e. `daily-notes.json`, `page-preview.json`, `zk-prefixer.json`) */
	corePluginSettings: boolean;
	/** Whether to sync active community plugins (stored in `community-plugins.json`) */
	activeCommunityPlugins: boolean;
	/** Whether to sync community plugin settings (stored inside `plugins/` folder. Must exclude this plugin settings!) */
	communityPluginSettings: boolean;
}

/** Settings to select which files in the vault to be synced. */
export interface SelectiveSyncSettings {
	/** Folders (directory, prefix) to exclude from being synced. */
	excludedFolders: string[];
	/** Whether should sync image files. */
	imageFiles: boolean;
	/** Whether should sync audio files. */
	audioFiles: boolean;
	/** Whether should sync video files. */
	videoFiles: boolean;
	/** Whether should sync PDF files. */
	pdfFiles: boolean;
	/** Whether should sync misc mime-type files. */
	otherFiles: boolean;
}

/** Awan plugin settings coming from data.json. */
export interface AwanSettings {
	/** The service type to use */
	serviceType: SupportedServiceType;
	/** The key to password in Obsidian keychain for encryption. */
	password: string;
	/** Sync concurrency. */
	concurrency: number;
	/** Conflict resolution strategy. */
	conflictAction: ConflictAction;
	/** Settings enable sync vault settings. */
	vaultSyncSettings: VaultSyncSettings;
	/** Settings to select which files in the vault to be synced. */
	selectiveSync: SelectiveSyncSettings;
	/** S3 configurations. */
	s3: S3Config;
}

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
	accessKeyId: z.string().min(1),
	secretAccessKey: z.string().min(1),
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