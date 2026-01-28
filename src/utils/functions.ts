import { Vault } from "obsidian";

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
