import Redis from 'ioredis';
import { logger } from './logger';

interface CacheOptions {
ttl?: number;
prefix?: string;
version?: string;
}

interface CacheStats {
hits: number;
misses: number;
keys: number;
}

type CacheValue = string | number | boolean | object | null;

/**
* Cache utility that provides Redis-based caching with in-memory fallback
* Supports TTL, versioning, prefixing, and monitoring
*/
export class Cache {
private static instance: Cache;
private redis: Redis | null = null;
private memoryCache: Map<string, { value: string; expires: number }>;
private stats: CacheStats = { hits: 0, misses: 0, keys: 0 };
private readonly defaultTTL = 3600; // 1 hour
private readonly prefix: string;
private readonly version: string;

private constructor(options: CacheOptions = {}) {
    this.prefix = options.prefix || 'app:';
    this.version = options.version || 'v1';
    this.memoryCache = new Map();

    try {
    this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (err) => {
        logger.error('Redis connection error:', err);
        this.fallbackToMemory();
    });
    } catch (err) {
    logger.warn('Failed to initialize Redis, falling back to memory cache:', err);
    this.fallbackToMemory();
    }
}

/**
* Gets the singleton instance of the Cache
*/
public static getInstance(options?: CacheOptions): Cache {
    if (!Cache.instance) {
    Cache.instance = new Cache(options);
    }
    return Cache.instance;
}

/**
* Generates a cache key with prefix and version
*/
private generateKey(key: string): string {
    return `${this.prefix}${this.version}:${key}`;
}

/**
* Gets a value from cache
*/
public async get<T extends CacheValue>(key: string): Promise<T | null> {
    const fullKey = this.generateKey(key);
    try {
    if (this.redis) {
        const value = await this.redis.get(fullKey);
        this.updateStats(value !== null);
        return value ? JSON.parse(value) : null;
    }
    return this.getFromMemory<T>(fullKey);
    } catch (err) {
    logger.error('Cache get error:', err);
    return this.getFromMemory<T>(fullKey);
    }
}

/**
* Sets a value in cache
*/
public async set(key: string, value: CacheValue, ttl?: number): Promise<void> {
    const fullKey = this.generateKey(key);
    const serializedValue = JSON.stringify(value);
    const expires = ttl || this.defaultTTL;

    try {
    if (this.redis) {
        await this.redis.set(fullKey, serializedValue, 'EX', expires);
    } else {
        this.setInMemory(fullKey, serializedValue, expires);
    }
    this.stats.keys++;
    } catch (err) {
    logger.error('Cache set error:', err);
    this.setInMemory(fullKey, serializedValue, expires);
    }
}

/**
* Deletes a value from cache
*/
public async delete(key: string): Promise<void> {
    const fullKey = this.generateKey(key);
    try {
    if (this.redis) {
        await this.redis.del(fullKey);
    }
    this.memoryCache.delete(fullKey);
    this.stats.keys = Math.max(0, this.stats.keys - 1);
    } catch (err) {
    logger.error('Cache delete error:', err);
    }
}

/**
* Clears all cache entries
*/
public async clear(): Promise<void> {
    try {
    if (this.redis) {
        const keys = await this.redis.keys(`${this.prefix}${this.version}:*`);
        if (keys.length) {
        await this.redis.del(...keys);
        }
    }
    this.memoryCache.clear();
    this.stats.keys = 0;
    } catch (err) {
    logger.error('Cache clear error:', err);
    }
}

/**
* Gets cache statistics
*/
public getStats(): CacheStats {
    return { ...this.stats };
}

/**
* Warms up cache with provided data
*/
public async warmUp(data: Record<string, CacheValue>, ttl?: number): Promise<void> {
    const promises = Object.entries(data).map(([key, value]) => 
    this.set(key, value, ttl)
    );
    await Promise.all(promises);
}

/**
* Deletes cache entries by pattern
*/
public async deletePattern(pattern: string): Promise<void> {
    try {
    if (this.redis) {
        const keys = await this.redis.keys(this.generateKey(pattern));
        if (keys.length) {
        await this.redis.del(...keys);
        }
    }
    // Clear matching keys from memory cache
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
        this.memoryCache.delete(key);
        }
    }
    } catch (err) {
    logger.error('Cache deletePattern error:', err);
    }
}

private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) {
    this.updateStats(false);
    return null;
    }
    
    if (Date.now() > item.expires) {
    this.memoryCache.delete(key);
    this.updateStats(false);
    return null;
    }

    this.updateStats(true);
    return JSON.parse(item.value);
}

private setInMemory(key: string, value: string, ttl: number): void {
    this.memoryCache.set(key, {
    value,
    expires: Date.now() + (ttl * 1000)
    });
}

private fallbackToMemory(): void {
    this.redis = null;
    logger.info('Switched to in-memory cache');
}

private updateStats(hit: boolean): void {
    if (hit) {
    this.stats.hits++;
    } else {
    this.stats.misses++;
    }
}
}

// Export default instance
export const cache = Cache.getInstance();

