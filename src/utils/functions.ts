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
