import {
	_Object,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	HeadObjectCommandOutput,
	ListObjectsV2Command,
	ListObjectsV2CommandInput,
	PutObjectCommand,
	PutObjectCommandInput,
	S3Client,
	S3ClientConfig
} from "@aws-sdk/client-s3";
import { App, requestUrl, RequestUrlParam } from "obsidian";
import { RemoteFileSystem, Entity } from "./fsAbstract";
import { FetchHttpHandler, FetchHttpHandlerOptions } from "@smithy/fetch-http-handler";
import { HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { type HttpHandlerOptions } from "@smithy/types"
import { buildQueryString } from "@smithy/querystring-builder"
import { DEFAULT_CONTENT_TYPE, type S3Config } from "./types"
import PQueue from "p-queue";
import { bufferToArrayBuffer, getDirectoryLevels } from "utils";
import { Upload } from "@aws-sdk/lib-storage";
// @ts-ignore
import * as mime from "mime-types";
import { Readable } from "stream"; // eslint-disable-line
// @ts-ignore
import { requestTimeout } from "@smithy/fetch-http-handler/dist-es/request-timeout";

export const DEFAULT_S3_CONFIG: S3Config = {
	accessKeyId: "",
	secretAccessKey: "",
	endpoint: "",
	region: "",
	bucket: "",
	forcePathStyle: false,
	partsConcurrency: 5,
}

class ObsidianRequestHandler extends FetchHttpHandler {
	requestTimeoutInMs: number | undefined;
	reverseProxyNoSignUrl: string | undefined;

	constructor(
		options?: FetchHttpHandlerOptions,
		reverseProxyNoSignUrl?: string
	) {
		super(options);
		this.requestTimeoutInMs = options === undefined ? undefined : options.requestTimeout;
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

		let transformedBody: any = body;
		if (ArrayBuffer.isView(body)) {
			transformedBody = bufferToArrayBuffer(body);
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
			requestTimeout(this.requestTimeoutInMs)
		];

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

	let clientConfig: S3ClientConfig = {
		region: config.region,
		endpoint: endpoint,
		forcePathStyle: config.forcePathStyle,
		credentials: {
			accessKeyId: app.secretStorage.getSecret(config.accessKeyId) || '',
			secretAccessKey: app.secretStorage.getSecret(config.secretAccessKey) || '',
		},
	};

	if (config.bypassCorsLocally) {
		clientConfig.requestHandler = new ObsidianRequestHandler(
			undefined,
			config.reverseProxyNoSignUrl
		)
	}

	let client = new S3Client(clientConfig);
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
	private synthDirectoryCache: Record<string, Entity>;

	constructor(app: App, config: S3Config) {
		super(app, 's3');
		this.config = config;
		this.client = getS3Client(app, this.config);
		this.synthDirectoryCache = {};
	}

	async walk(): Promise<Entity[]> {
		return (await this._walk(this.config.remotePrefix, false))
			.filter((x) => x.key !== "" && x.key !== "/");
	}

	async walkPartial(): Promise<Entity[]> {
		return (await this._walk(this.config.remotePrefix, true))
			.filter((x) => x.key !== "" && x.key !== "/");
	}

	private async _walk(prefixOfRawKeys: string | undefined, partial: boolean) {
		const commandInput = {
			Bucket: this.config.bucket,
		} as ListObjectsV2CommandInput;
		if (prefixOfRawKeys !== undefined && prefixOfRawKeys !== "") {
			commandInput.Prefix = prefixOfRawKeys;
		}
		if (partial) {
			commandInput.MaxKeys = 10;
		}

		const contents = [] as _Object[];
		const mtimeRecords: Record<string, number> = {};
		const ctimeRecords: Record<string, number> = {};
		const partsConcurrency = partial ? 1 : this.config.partsConcurrency;
		const queueHead = new PQueue({
			concurrency: partsConcurrency,
			autoStart: true,
		});
		queueHead.on("error", (error) => {
			queueHead.pause();
			queueHead.clear();
			throw error;
		});

		let isTruncated = true;
		do {
			const res = await this.client.send(new ListObjectsV2Command(commandInput));

			if (res.$metadata.httpStatusCode !== 200) {
				throw Error(`Unexpected error when List remote. ${JSON.stringify(res)}`);
			}
			if (res.Contents === undefined) {
				break;
			}
			contents.push(...res.Contents);

			if (this.config.useAccurateMTime) {
				for (const content of res.Contents) {
					await queueHead.add(async () => {
						const responseHead = await this.client.send(
							new HeadObjectCommand({
								Bucket: this.config.bucket,
								Key: content.Key,
							})
						);
						if (responseHead.$metadata.httpStatusCode !== 200) {
							throw Error("some thing bad while heading single object!");
						}
						if (responseHead.Metadata === undefined) {
							// pass
						} else {
							mtimeRecords[content.Key!] = Math.floor(
								Number.parseFloat(
									responseHead.Metadata.mtime || responseHead.Metadata.MTime || "0"
								)
							);
							ctimeRecords[content.Key!] = Math.floor(
								Number.parseFloat(
									responseHead.Metadata.ctime || responseHead.Metadata.CTime || "0"
								)
							);
						}
					});
				}
			}

			if (partial) {
				isTruncated = false;
			} else {
				isTruncated = res.IsTruncated ?? false;
				commandInput.ContinuationToken = res.NextContinuationToken;
				if (
					isTruncated &&
					(commandInput.ContinuationToken === undefined ||
						commandInput.ContinuationToken === "")
				) {
					throw Error("isTruncated is true but no continuationToken provided");
				}
			}
		} while (isTruncated);

		await queueHead.onIdle();

		const res: Entity[] = [];
		const realEnrities = new Set<string>();
		for (const remoteObj of contents) {
			const remoteEntity = fromS3ObjectToEntity(
				remoteObj,
				this.config.remotePrefix ?? "",
				mtimeRecords,
				ctimeRecords
			);
			realEnrities.add(remoteEntity.key!);
			res.push(remoteEntity);

			for (const f of getDirectoryLevels(remoteEntity.key!, true)) {
				if (realEnrities.has(f)) {
					delete this.synthDirectoryCache[f];
					continue;
				}
				if (
					!this.synthDirectoryCache.hasOwnProperty(f) ||
					remoteEntity.serverMTime >= (this.synthDirectoryCache[f] as Entity).serverMTime!
				) {
					this.synthDirectoryCache[f] = {
						key: f,
						keyRaw: f,
						size: 0,
						serverMTime: remoteEntity.serverMTime,
						serverMTimeFormatted: remoteEntity.serverMTimeFormatted,
						clientMTime: remoteEntity.clientMTime,
						clientMTimeFormatted: remoteEntity.clientMTimeFormatted,
					} as Entity;
				}
			}
		}
		for (const key of Object.keys(this.synthDirectoryCache)) {
			res.push(this.synthDirectoryCache[key] as Entity);
		}
		return res;
	}

	async status(key: string): Promise<Entity> {
		if (this.synthDirectoryCache.hasOwnProperty(key)) {
			return this.synthDirectoryCache[key] as Entity;
		}

		let keyFullPath = key;
		keyFullPath = addPrefixPath(keyFullPath, this.config.remotePrefix ?? "");

		return await this._status(key);
	}

	private async _status(key: string): Promise<Entity> {
		this.ensurePrefixed(key);
		const res = await this.client.send(
			new HeadObjectCommand({
				Bucket: this.config.bucket,
				Key: key,
			})
		);

		return fromS3HeadObjectToEntity(
			key,
			res,
			this.config.remotePrefix ?? "",
			this.config.useAccurateMTime ?? false
		);
	}

	async mkdir(key: string, mtime?: number, ctime?: number): Promise<Entity> {
		if (!key.endsWith("/")) {
			throw new Error(`You should not call mkdir on ${key}!`);
		}

		const generateFolderObject = this.config.generateFolderObject ?? false;
		if (!generateFolderObject) {
			const synth = {
				key: key,
				keyRaw: key,
				size: 0,
				sizeRaw: 0,
				serverMTime: mtime,
				clientMTime: mtime,
			} as Entity;
			this.synthDirectoryCache[key] = synth;
			return synth;
		}

		const uploadFile = addPrefixPath(key, this.config.remotePrefix ?? "");
		return await this._mkdir(uploadFile, mtime, ctime);
	}

	private async _mkdir(key: string, mtime?: number, ctime?: number) {
		this.ensurePrefixed(key);

		const contentType = DEFAULT_CONTENT_TYPE;
		const command: PutObjectCommandInput = {
			Bucket: this.config.bucket,
			Key: key,
			Body: "",
			ContentType: contentType,
			ContentLength: 0,
		};
		const metadata: Record<string, string> = {};
		if (mtime !== undefined && mtime !== 0) {
			metadata["MTime"] = `${mtime / 1000.0}`;
		}
		if (ctime !== undefined && ctime !== 0) {
			metadata["CTime"] = `${ctime / 1000.0}`;
		}
		if (Object.keys(metadata).length > 0) {
			command["Metadata"] = metadata;
		}
		await this.client.send(new PutObjectCommand(command));
		return await this._status(key);
	}

	async write(key: string, content: ArrayBuffer, mtime: number, ctime: number): Promise<Entity> {
		const uploadKey = addPrefixPath(key, this.config.remotePrefix ?? "");

		return await this._write(uploadKey, content, mtime, ctime);
	}

	private async _write(key: string, content: ArrayBuffer, mtime: number, ctime: number): Promise<Entity> {
		this.ensurePrefixed(key);
		const body = new Uint8Array(content);

		let contentType = DEFAULT_CONTENT_TYPE;
		contentType = mime.contentType(mime.lookup(key) || DEFAULT_CONTENT_TYPE) || DEFAULT_CONTENT_TYPE;

		const upload = new Upload({
			client: this.client,
			queueSize: this.config.partsConcurrency,
			partSize: 1024 * 1024 * 5,
			leavePartsOnError: false,
			params: {
				Bucket: this.config.bucket,
				Key: key,
				Body: body,
				ContentType: contentType,
				Metadata: {
					MTime: `${mtime / 1000.0}`,
					CTime: `${ctime / 1000.0}`,
				},
			},
		});
		await upload.done();

		return await this._status(key);
	}

	async read(key: string): Promise<ArrayBuffer> {
		if (key.endsWith("/")) {
			throw new Error(`Should not call this function on a directory. Got: ${key}`);
		}
		const downloadFile = addPrefixPath(key, this.config.remotePrefix ?? "");

		return await this._read(downloadFile);
	}

	async _read(key: string): Promise<ArrayBuffer> {
		if (
			this.config.remotePrefix !== undefined &&
			this.config.remotePrefix !== "" &&
			!key.startsWith(this.config.remotePrefix)
		) {
			throw Error(`Should only accept prefixed path. Got: "${key}"`);
		}
		const data = await this.client.send(
			new GetObjectCommand({
				Bucket: this.config.bucket,
				Key: key,
			})
		);
		const bodyContents = await getObjectBodyToArrayBuffer(data.Body);
		return bodyContents;
	}

	async mv(_from: string, _to: string): Promise<void> {
		throw new Error("Method not implemented for S3.");
	}

	async rm(key: string): Promise<void> {
		const command = new DeleteObjectCommand({
			Bucket: this.config.bucket,
			Key: key,
		});

		await this.client.send(command);
	}

	async testConnection(callback?: (err: any) => void): Promise<boolean> {
		try {
			console.debug("Test connection: List objects command")
			const command = {
				Bucket: this.config.bucket,
			} as ListObjectsV2CommandInput;
			const results = await this.client.send(
				new ListObjectsV2Command(command)
			);

			if (
				results === undefined ||
				results.$metadata === undefined ||
				results.$metadata.httpStatusCode === undefined
			) {
				throw Error("Results, $metadata, or HTTP Status code is undefined. ");
			}
			if (results.$metadata.httpStatusCode !== 200) {
				throw Error(`Status code is not OK (200). Got: ${results.$metadata.httpStatusCode}`);
			}
		} catch (err: any) {
			console.debug(err);
			if (callback !== undefined) {
				if (this.config.endpoint.contains(this.config.bucket)) {
					const err2 = new Error([
						err?.toString() || '',
						"You have included the bucket name inside the endpoint. Remove the bucket name and try again."
					].join(' '));
					callback(err2);
				} else {
					callback(err);
				}
			}
			return false;
		}

		console.debug("Test connection: Walk");
		await this.walk();

		console.debug("Test connection: Walk partial");
		await this.walkPartial();

		return await this.commonTestConnectionOps(callback);

	}

	getClient(): S3Client {
		return this.client;
	}

	private ensurePrefixed(key: string): void {
		if (
			this.config.remotePrefix !== undefined &&
			this.config.remotePrefix !== "" &&
			!key.startsWith(this.config.remotePrefix)
		) {
			throw Error(`Should only accept prefixed path. Got: "${key}"`);
		}
	}
}

// Export S3Config for other modules
export type { S3Config } from "./types"

function addPrefixPath(path: string, prefix: string) {
	if (prefix === undefined || prefix === "") {
		return path;
	}
	let key = path;
	if (path === "/" || path === "") {
		key = prefix;
	}
	if (!path.startsWith("/")) {
		key = `${prefix}${path}`;
	}
	return key;
};

function removePrefixPath(pathWithPrefix: string, prefix: string) {
	if (
		!(
			pathWithPrefix === `${prefix}` ||
			pathWithPrefix.startsWith(`${prefix}`)
		)
	) {
		throw Error(
			`"${pathWithPrefix}" doesn't starts with "${prefix}"`
		);
	}
	return pathWithPrefix.slice(`${prefix}`.length);
};

function fromS3HeadObjectToEntity(
	path: string,
	headObject: HeadObjectCommandOutput,
	remotePrefix: string,
	useAccurateMTime: boolean
): Entity {
	if (headObject.LastModified === undefined) {
		throw Error(
			`s3 object ${path} doesn't have LastModified value: ${JSON.stringify(
				headObject
			)}`
		);
	}
	const serverMTime = Math.floor(headObject.LastModified.valueOf() / 1000.0) * 1000;
	let clientMTime = serverMTime;
	if (useAccurateMTime && headObject.Metadata !== undefined) {
		const mtime = Math.floor(
			Number.parseFloat(headObject.Metadata.mtime || headObject.Metadata.MTime || "0")
		);
		if (mtime !== 0) {
			// to be compatible with RClone, we read and store the time in seconds in new version!
			if (mtime >= 1000000000000) {
				// it's a millsecond, uploaded by old codes..
				clientMTime = mtime;
			} else {
				// it's a second, uploaded by new codes of the plugin from March 24, 2024
				clientMTime = mtime * 1000;
			}
		}
	}
	const key = removePrefixPath(path, remotePrefix);

	return {
		key: key,
		keyRaw: key,
		serverMTime: serverMTime,
		clientMTime: clientMTime,
		sizeRaw: headObject.ContentLength,
		size: headObject.ContentLength,
		etag: headObject.ETag,
	} as Entity;
};

function fromS3ObjectToEntity(
	obj: _Object,
	remotePrefix: string,
	mtimeRecords: Record<string, number>,
	ctimeRecords: Record<string, number>
): Entity {
	if (obj.LastModified === undefined) {
		throw Error(`S3 Object ${obj.Key} does not have LastModified value: ${JSON.stringify(obj)}`)
	}

	const serverMtime = Math.floor(obj.LastModified.valueOf() / 1000.0) * 1000;
	let clientMtime = serverMtime;

	if (obj.Key! in mtimeRecords) {
		const mtime = mtimeRecords[obj.Key!];
		if (mtime !== 0) {
			clientMtime = mtime as number * 1000;
		}
	}
	const key = removePrefixPath(obj.Key!, remotePrefix); // Remove prefix

	return {
		key: key,
		keyRaw: key,
		serverMTime: serverMtime,
		clientMTime: clientMtime,
		sizeRaw: obj.Size!,
		size: obj.Size!,
		etag: obj.ETag!,
	} as Entity;
}

/**
 * The body of AWS GetObject response has mix types
 * but we want to get ArrayBuffer here.
 *
 * @see `https://github.com/aws/aws-sdk-js-v3/issues/1877`
 * @param body The Body of GetObject
 * @returns Promise<ArrayBuffer>
 */
async function getObjectBodyToArrayBuffer(body: Readable | ReadableStream | Blob | undefined) {
	if (body === undefined) {
		throw Error(`ObjectBody is undefined and don't know how to deal with it`);
	}
	if (body instanceof Readable) {
		return (await new Promise((resolve, reject) => {
			const chunks: Uint8Array[] = [];
			body.on("data", (chunk) => chunks.push(chunk));
			body.on("error", reject);
			body.on("end", () => resolve(bufferToArrayBuffer(Buffer.concat(chunks))));
		})) as ArrayBuffer;
	} else if (body instanceof ReadableStream) {
		return await new Response(body, {}).arrayBuffer();
	} else if (body instanceof Blob) {
		return await body.arrayBuffer();
	} else {
		throw TypeError(`The type of ${body} is not one of the supported types`);
	}
};
