import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client
} from "@aws-sdk/client-s3";
import { App, requestUrl, RequestUrlParam } from "obsidian";
import { RemoteFileSystem, FileInfo, UploadOptions, DownloadOptions, ListOptions, ListResult } from "./fsAbstract";
import { FetchHttpHandler, FetchHttpHandlerOptions } from "@smithy/fetch-http-handler";
import { HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { type HttpHandlerOptions } from "@smithy/types"
import { buildQueryString } from "@smithy/querystring-builder"
import type { S3Config } from "./types"

export const DEFAULT_S3_CONFIG: S3Config = {
	accessKeyId: "",
	secretAccessKey: "",
	endpoint: "",
	region: "",
	bucket: "",
	forcePathStyle: false,
}

class ObsidianRequestHandler extends FetchHttpHandler {
	requestTimeoutInMs: number | undefined;
	reverseProxyNoSignUrl: string | undefined;
	constructor(
		options?: FetchHttpHandlerOptions,
		reverseProxyNoSignUrl?: string
	) {
		super(options);
		this.requestTimeoutInMs =
			options === undefined ? undefined : options.requestTimeout;
		this.reverseProxyNoSignUrl = reverseProxyNoSignUrl;
	}
	async handle(
		request: HttpRequest,
		{ abortSignal }: HttpHandlerOptions = {}
	): Promise<{ response: HttpResponse }> {
		// Reject if aborted.
		if (abortSignal?.aborted) {
			const abortError = new Error("Request aborted");
			abortError.name = "AbortError";
			return Promise.reject(abortError);
		}

		// Build path.
		let path = request.path;
		if (request.query) {
			const queryString = buildQueryString(request.query);
			if (queryString) {
				path += `?${queryString}`;
			}
		}
		const { port, method } = request;
		let url = `${request.protocol}//${request.hostname}${port ? `:${port}` : ""}${path}`;
		if (
			this.reverseProxyNoSignUrl !== undefined &&
			this.reverseProxyNoSignUrl !== ""
		) {
			const urlObj = new URL(url);
			urlObj.host = this.reverseProxyNoSignUrl;
			url = urlObj.href;
		}
		const body: Uint8Array | string | undefined = // eslint-disable-line
			method === "GET" || method === "HEAD" ? undefined : request.body;

		const transformedHeaders: Record<string, string> = {};
		for (const key of Object.keys(request.headers)) {
			const keyLower = key.toLowerCase();
			if (keyLower === "host" || keyLower === "content-length") {
				continue;
			}
			const headerValue = request.headers[key];
			if (headerValue !== undefined) {
				transformedHeaders[keyLower] = headerValue;
			}
		}

		let contentType: string | undefined = undefined;
		if (transformedHeaders["content-type"] !== undefined) {
			contentType = transformedHeaders["content-type"];
		}

		let transformedBody: Uint8Array | string | undefined = body;
		if (ArrayBuffer.isView(body)) {
			transformedBody = new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));
		}

		const param: RequestUrlParam = {
			body: transformedBody,
			headers: transformedHeaders,
			method: method,
			url: url,
			contentType: contentType,
		};

		const promises = [
			requestUrl(param).then((response) => {
				const headers = response.headers;
				const headersLower: Record<string, string> = {};
				for (const key of Object.keys(headers)) {
					const headerValue = headers[key];
					if (headerValue !== undefined) {
						headersLower[key.toLowerCase()] = headerValue;
					}
				}
				const stream = new ReadableStream<Uint8Array>({
					start(controller) {
						controller.enqueue(new Uint8Array(response.arrayBuffer));
						controller.close();
					},
				});
				return {
					response: new HttpResponse({
						headers: headersLower,
						statusCode: response.status,
						body: stream,
					}),
				};
			}),
		];

		if (this.requestTimeoutInMs) {
			promises.push(
				new Promise<never>((_, reject) => {
					setTimeout(() => {
						reject(new Error("Request timed out"));
					}, this.requestTimeoutInMs);
				})
			);
		}

		if (abortSignal) {
			promises.push(
				new Promise<never>((_resolve, reject) => {
					abortSignal.onabort = () => {
						const abortError = new Error("Request aborted");
						abortError.name = "AbortError";
						reject(abortError);
					};
				})
			);
		}
		return Promise.race(promises);
	}
}

export const getS3Client = (app: App, config: S3Config): S3Client => {
	let endpoint = config.endpoint ?? "";
	if (!(endpoint.startsWith("http://") || endpoint.startsWith("https://"))) {
		endpoint = `https://${endpoint}`;
	}

	let client: S3Client;

	if (config.bypassCorsLocally) {
		client = new S3Client({
			region: config.region,
			endpoint: endpoint,
			forcePathStyle: config.forcePathStyle,
			credentials: {
				accessKeyId: app.secretStorage.getSecret(config.accessKeyId) || '',
				secretAccessKey: app.secretStorage.getSecret(config.secretAccessKey) || '',
			},
			requestHandler: new ObsidianRequestHandler(
				undefined,
				config.reverseProxyNoSignUrl
			)
		})
	} else {
		client = new S3Client({
			region: config.region,
			endpoint: endpoint,
			forcePathStyle: config.forcePathStyle,
			credentials: {
				accessKeyId: app.secretStorage.getSecret(config.accessKeyId) || '',
				secretAccessKey: app.secretStorage.getSecret(config.secretAccessKey) || '',
			}
		})
	}

	client.middlewareStack.add(
		(next, _context) => (args) => {
			const request = args.request as HttpRequest;
			if (request.headers) {
				request.headers["cache-control"] = "no-cache";
			}
			return next(args);
		},
		{
			step: "build",
		}
	);

	return client;
}

export class S3FileSystem extends RemoteFileSystem {
	private client: S3Client;
	private config: S3Config;
	private bucket: string;

	constructor(app: App, config: S3Config) {
		super(app, 's3');
		this.config = config;
		this.client = getS3Client(app, this.config);
		this.bucket = config.bucket;
	}

	async uploadFile(options: UploadOptions): Promise<void> {
		// Convert body to appropriate type for S3
		let body: Uint8Array | string | Blob;
		if (options.body instanceof ArrayBuffer) {
			body = new Uint8Array(options.body);
		} else if (typeof options.body === 'string' || options.body instanceof Blob) {
			body = options.body;
		} else {
			body = options.body;
		}

		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: options.key,
			Body: body,
			ContentType: options.contentType,
			Metadata: options.metadata,
		});

		await this.client.send(command);
	}

	async downloadFile(options: DownloadOptions): Promise<ArrayBuffer | Uint8Array | Blob | string> {
		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: options.key,
			Range: options.range,
		});

		const response = await this.client.send(command);

		if (response.Body) {
			// Convert the response body to bytes
			return response.Body.transformToByteArray();
		}

		throw new Error('No file content received');
	}

	async deleteFile(key: string): Promise<void> {
		const command = new DeleteObjectCommand({
			Bucket: this.bucket,
			Key: key,
		});

		await this.client.send(command);
	}

	async listFiles(options: ListOptions = {}): Promise<ListResult> {
		const command = new ListObjectsV2Command({
			Bucket: this.bucket,
			Prefix: options.prefix,
			MaxKeys: options.maxKeys,
			ContinuationToken: options.continuationToken,
		});

		const response = await this.client.send(command);

		const files = [];

		if (response.Contents) {
			for (const object of response.Contents) {
				if (object.Key && object.LastModified && object.ETag && object.Size !== undefined) {
					const mtime = object.LastModified.getTime();
					const mtimeStr = object.LastModified.toISOString();

					files.push({
						key: object.Key,
						keyRaw: object.Key,
						mtimeSvr: mtime,
						mtimeCli: mtime,
						sizeRaw: object.Size,
						size: object.Size,
						etag: object.ETag,
						synthesizedFolder: false,
						keyEnc: object.Key,
						sizeEnc: object.Size,
						mtimeCliFmt: mtimeStr,
						mtimeSvrFmt: mtimeStr,
					});
				}
			}
		}

		return {
			files,
			continuationToken: response.NextContinuationToken,
			isTruncated: response.IsTruncated || false,
		};
	}

	async getFileInfo(key: string): Promise<FileInfo | null> {
		try {
			const command = new HeadObjectCommand({
				Bucket: this.bucket,
				Key: key,
			});

			const response = await this.client.send(command);

			if (response.LastModified && response.ETag && response.ContentLength !== undefined) {
				const mtime = response.LastModified.getTime();
				const mtimeStr = response.LastModified.toISOString();

				return {
					key,
					keyRaw: key,
					mtimeSvr: mtime,
					mtimeCli: mtime,
					sizeRaw: response.ContentLength,
					size: response.ContentLength,
					etag: response.ETag,
					synthesizedFolder: false,
					keyEnc: key,
					sizeEnc: response.ContentLength,
					mtimeCliFmt: mtimeStr,
					mtimeSvrFmt: mtimeStr,
				};
			}
		} catch {
			// File doesn't exist or access denied
			return null;
		}

		return null;
	}

	async testConnection(): Promise<boolean> {
		try {
			const command = new HeadBucketCommand({
				Bucket: this.bucket,
			});

			await this.client.send(command);
			return true;
		} catch (error) {
			console.error('S3 connection test failed:', error);
			return false;
		}
	}

	getBucket(): string {
		return this.bucket;
	}

	getS3Client(): S3Client {
		return this.client;
	}
}

// Export S3Config for other modules
export type { S3Config } from "./types"
