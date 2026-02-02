import { Entity } from "filesystems/abstract";
import { Vault } from "obsidian";
import { SupportedServiceType } from "types";

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
 * Convert UNIX timestamp to its string readable format.
 * 
 * @param ts The timestamp to be converted to string.
 * @param withMs When the {@link ts} to convert has milliseconds in it.
 * @returns The string representation of the UNIX timestamp.
 */
function unixTimeToStr(
	ts: number | undefined | null,
	withMs = false
): string | undefined {
	if (ts === undefined || ts === null || Number.isNaN(ts)) {
		return undefined;
	}
	if (withMs) {
		// 1716712162574 -> '2024-05-26T16:29:22.574+08:00'
		return window.moment(ts).toISOString(true);
	} else {
		// 1716712162574 -> '2024-05-26T16:29:22+08:00'
		return window.moment(ts).format();
	}
};

/**
 * Fix time format of an entity.
 * 
 * @param entity Entity to fix the time format.
 * @param [serviceType='s3'] The service type of the entity where it come from.
 * 	This determines how the time is converted. For S3, rounds the timestamp to second instead of millisecond.
 * @returns The entity with the fixed time format.
 */
export function fixTimeformat(entity: Entity, serviceType: SupportedServiceType = 's3'): Entity {
	// convertKeys is a mapping of <sourceKey, targetKey>.
	const convertKeys: Partial<Record<keyof Entity, keyof Entity>> = {
		clientCTime: "clientCTimeFormatted",
		clientMTime: "clientMTimeFormatted",
		serverMTime: "serverMTimeFormatted",
	};

	const convertEntity = (entity: Entity, fromKey: keyof Entity, toKey: keyof Entity): Entity => {
		let original: string | number | boolean | undefined = entity[fromKey];
		if (typeof original !== 'number' && original !== undefined) {
			throw Error(`Type of ${fromKey} (${typeof original}) cannot be converted to time format.`);
		}
		let formatted: string | undefined;

		if (original !== undefined) {
			if (original === 0) {
				original = undefined;
			} else {
				if (serviceType === "s3") {
					// Round to second from millisecond.
					original = Math.floor(original / 1000.0) * 1000;
				}
				formatted = unixTimeToStr(original);
			}
		}

		return Object.assign({}, entity, {
			[fromKey]: original,
			[toKey]: formatted
		});
	}

	let result = Object.assign({}, entity);
	for (const [fromKey, toKey] of Object.entries(convertKeys)) {
		result = convertEntity(result, fromKey as keyof Entity, toKey);
	}

	return result;
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