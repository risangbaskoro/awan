// Utility functions

export const bufferToArrayBuffer = (
	buffer: Uint8Array | ArrayBufferView
) => {
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};
