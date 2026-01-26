export function bufferToArrayBuffer(buffer: Buffer | Uint8Array | ArrayBufferView) { // eslint-disable-line
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
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
