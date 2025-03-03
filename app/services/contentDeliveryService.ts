import { S3, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CloudFront } from '@aws-sdk/client-cloudfront';
import { Redis } from 'ioredis';
import ffmpeg from 'fluent-ffmpeg';

interface ContentMetadata {
id: string;
title: string;
type: 'video' | 'document' | 'image';
mimeType: string;
size: number;
duration?: number;
qualities?: string[];
courseId: string;
}

interface StreamingOptions {
quality?: string;
startTime?: number;
endTime?: number;
}

class ContentDeliveryService {
private s3Client: S3;
private cloudFront: CloudFront;
private redis: Redis;
private readonly CACHE_TTL = 3600; // 1 hour
private readonly BUCKET_NAME = process.env.S3_BUCKET_NAME;
private readonly CDN_DOMAIN = process.env.CLOUDFRONT_DOMAIN;

constructor() {
    this.s3Client = new S3({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
    });

    this.cloudFront = new CloudFront({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
    });

    this.redis = new Redis(process.env.REDIS_URL!);
}

async uploadContent(file: Buffer, metadata: ContentMetadata): Promise<string> {
    try {
    const key = `${metadata.courseId}/${metadata.id}/${metadata.title}`;
    
    await this.s3Client.send(new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: metadata.mimeType,
        Metadata: {
        courseId: metadata.courseId,
        contentId: metadata.id,
        contentType: metadata.type
        }
    }));

    if (metadata.type === 'video') {
        await this.generateVideoQualities(key);
    }

    await this.invalidateCache(key);
    return key;
    } catch (error) {
    throw new Error(`Failed to upload content: ${error.message}`);
    }
}

async getStreamingUrl(contentId: string, options: StreamingOptions = {}): Promise<string> {
    const cacheKey = `stream:${contentId}:${JSON.stringify(options)}`;
    const cachedUrl = await this.redis.get(cacheKey);

    if (cachedUrl) {
    return cachedUrl;
    }

    const command = new GetObjectCommand({
    Bucket: this.BUCKET_NAME,
    Key: contentId,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    await this.redis.setex(cacheKey, this.CACHE_TTL, url);

    return url;
}

async getDownloadUrl(contentId: string, filename: string): Promise<string> {
    const command = new GetObjectCommand({
    Bucket: this.BUCKET_NAME,
    Key: contentId,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
}

private async generateVideoQualities(key: string): Promise<void> {
    const qualities = ['720p', '480p', '360p'];
    const promises = qualities.map(quality => this.transcodeVideo(key, quality));
    await Promise.all(promises);
}

private async transcodeVideo(key: string, quality: string): Promise<void> {
    const outputKey = `${key}_${quality}`;
    
    return new Promise((resolve, reject) => {
    ffmpeg()
        .input(this.getS3Url(key))
        .outputOptions([
        `-vf scale=${this.getResolutionForQuality(quality)}`,
        '-c:v h264',
        '-c:a aac'
        ])
        .output(this.getS3Url(outputKey))
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
}

private getResolutionForQuality(quality: string): string {
    const resolutions = {
    '720p': '1280x720',
    '480p': '854x480',
    '360p': '640x360'
    };
    return resolutions[quality] || '854x480';
}

private getS3Url(key: string): string {
    return `s3://${this.BUCKET_NAME}/${key}`;
}

private async invalidateCache(key: string): Promise<void> {
    await this.cloudFront.createInvalidation({
    DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID!,
    InvalidationBatch: {
        CallerReference: `${Date.now()}`,
        Paths: {
        Quantity: 1,
        Items: [`/${key}`]
        }
    }
    });
}

async cleanup(): Promise<void> {
    await this.redis.quit();
}
}

export default ContentDeliveryService;

