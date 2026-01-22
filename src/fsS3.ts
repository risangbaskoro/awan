import { S3Client } from "@aws-sdk/client-s3";
import { App } from "obsidian";

export interface S3Config {
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	region: string;
	bucket: string;
	forcePathStyle: boolean;
}

export const DEFAULT_S3_CONFIG: S3Config = {
	accessKeyId: "",
	secretAccessKey: "",
	endpoint: "",
	region: "",
	bucket: "",
	forcePathStyle: false
}

export const getS3Client = (app: App, config: S3Config): S3Client => {
	let endpoint = config.endpoint ?? "";
	if (!(endpoint.startsWith("http://") || endpoint.startsWith("https://"))) {
		endpoint = `https://${endpoint}`;
	}

	let client: S3Client;

	client = new S3Client({
		region: config.region,
		endpoint: endpoint,
		forcePathStyle: config.forcePathStyle,
		credentials: {
			accessKeyId: app.secretStorage.getSecret(config.accessKeyId) || '',
			secretAccessKey: app.secretStorage.getSecret(config.secretAccessKey) || '',
		}
	})

	return client;
}
