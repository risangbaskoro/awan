import { AwanSettings, S3ConfigSchema, SyncStatus } from "types";
import { IconName, Vault } from "obsidian";

/**
 * Converts buffer or buffer like object to ArrayBuffer.
 */
export function bufferToArrayBuffer(
	buffer: Uint8Array | ArrayBufferView
): ArrayBuffer | ArrayBufferLike {
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

/**
 * Concatenates multiple Uint8Arrays into a single Uint8Array.
 * Browser-compatible replacement for Buffer.concat().
 */
export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
	const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;

	for (const arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}

	return result;
}

/**
 * On Android the stat has bugs for folders. So we need a fixed version.
 */
export async function statFix(vault: Vault, path: string) {
	const s = await vault.adapter.stat(path);
	if (s === undefined || s === null) {
		throw Error(`${path} doesn't exist. Cannot run stat.`);
	}
	if (s.ctime === undefined || s.ctime === null || Number.isNaN(s.ctime)) {
		s.ctime = undefined as any; // eslint-disable-line
	}
	if (s.mtime === undefined || s.mtime === null || Number.isNaN(s.mtime)) {
		s.mtime = undefined as any; // eslint-disable-line
	}
	if (
		(s.size === undefined || s.size === null || Number.isNaN(s.size)) &&
		s.type === "folder"
	) {
		s.size = 0;
	}
	return s;
};

/**
 * Utility function to create recursive path list.
 *
 * i.e.
 *   - `"path/to/directory/"` -> `["path", "path/to", "path/to/directory"]`
 *   - `"path/to/another/file.ext"` -> `["path", "path/to", "path/to/another", "path/to/another/file.ext"]`
 *
 * @param input The path to convert.
 * @param [appendSeparator=false] Whether should append separator to each key.
 */
export function getDirectoryLevels(input: string, appendSeparator: boolean = false): string[] {
	const ret: string[] = [];

	if (input === "" || input === "/") {
		return ret;
	}

	const splits = input.split("/");
	for (let i = 0; i + 1 < splits.length; i++) {
		let key = splits.slice(0, i + 1).join("/");
		if (key === "" || key === "/") {
			continue;
		}
		if (appendSeparator) {
			key = `${key}/`;
		}
		ret.push(key);
	}

	return ret;
}

/**
 * Check the validity of the service settings.
 * 
 * @returns True if the settings are valid.
 */
export function validateServiceSettings(settings: AwanSettings): boolean {
	return S3ConfigSchema.safeParse(settings.s3).success;
}

/**
 * Get the icon string representation for the current plugin status.
 * @returns A Lucide icon string.
 */
export function getIconByStatus(status: SyncStatus | undefined): IconName {
	switch (status) {
		case SyncStatus.UNINITIALIZED: return 'cloud-off';
		case SyncStatus.IDLE: return 'cloud';
		case SyncStatus.SYNCING: return 'refresh-cw';
		case SyncStatus.SUCCESS: return 'cloud-check';
		case SyncStatus.ERROR: return 'cloud-alert';
		default: return 'cloud';
	}
}

/**
  * Get the color string representation for the current plugin status.
  * @returns A color string, used in conjunction with `mod-<color>` class.
  */
export function getColorByStatus(status: SyncStatus | undefined): 'default' | 'accent' | 'success' | 'warning' | 'error' {
	switch (status) {
		case SyncStatus.UNINITIALIZED: return 'error';
		case SyncStatus.SUCCESS: return 'success';
		case SyncStatus.ERROR: return 'error';
		case SyncStatus.SYNCING: return 'accent';
		default: return 'accent';
	}
}

/**
 * Set the element color by adding or removing mod classes.
 * 
 * @param color The color to be used. If omitted, reset the color to default.
 */
export function setColor(element: HTMLElement, color?: 'default' | 'accent' | 'success' | 'warning' | 'error') {
	switch (color) {
		case 'accent':
			element.removeClasses(['mod-success', 'mod-warning', 'mod-error']);
			element.addClass('mod-accent');
			break;
		case 'success':
			element.removeClasses(['mod-warning', 'mod-accent', 'mod-error']);
			element.addClass('mod-success');
			break;
		case 'warning':
			element.removeClasses(['mod-success', 'mod-accent', 'mod-error']);
			element.addClass('mod-warning');
			break;
		case 'error':
			element.removeClasses(['mod-success', 'mod-accent', 'mod-warning']);
			element.addClass('mod-error');
			break;
		default:
			element.removeClasses(['mod-success', 'mod-warning', 'mod-accent', 'mod-error']);
			break;
	}
}

/**
 * Convert a string of text to sentence case.
 * 
 * @param text
 */
export function toSentenceCase(text: string): string {
	return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, match => match.toUpperCase());
}

// /**
//  * Get the parent directory of the given path, 
//  * suffixed with a directory separator.
//  * 
//  * @param inputPath
//  * @returns
//  */
// export function getParentFolder(inputPath: string) {
// 	const parentDir = path.dirname(inputPath);
// 	if (parentDir === "." || parentDir === "/") {
// 		return "/"; // Root vault.
// 	}
// 	return `${normalizePath(parentDir)}/`;
// };