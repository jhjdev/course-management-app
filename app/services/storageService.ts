import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

interface StorageOptions {
encrypt?: boolean;
expire?: number;
compress?: boolean;
}

interface StorageMetrics {
usage: number;
quota: number;
items: number;
}

export class StorageService {
private encryptionKey: string;
private readonly QUOTA_LIMIT = 50 * 1024 * 1024; // 50MB default quota
private sqlite: SQLite.SQLiteDatabase;

constructor() {
    this.initializeStorage();
}

private async initializeStorage() {
    try {
    // Initialize SQLite
    this.sqlite = await SQLite.openDatabase({
        name: 'courseAppDB',
        location: 'default'
    });

    // Create necessary tables
    await this.initializeTables();

    // Generate encryption key if not exists
    this.encryptionKey = await this.getOrGenerateEncryptionKey();
    } catch (error) {
    console.error('Storage initialization failed:', error);
    throw new Error('Failed to initialize storage');
    }
}

private async initializeTables() {
    const tables = [
    `CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        timestamp INTEGER,
        expiry INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
    )`
    ];

    for (const table of tables) {
    await this.sqlite.executeSql(table);
    }
}

private async getOrGenerateEncryptionKey(): Promise<string> {
    try {
    const existingKey = await AsyncStorage.getItem('encryptionKey');
    if (existingKey) return existingKey;

    const newKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Date.now().toString()
    );
    await AsyncStorage.setItem('encryptionKey', newKey);
    return newKey;
    } catch (error) {
    console.error('Error managing encryption key:', error);
    throw error;
    }
}

async setItem(key: string, value: any, options?: StorageOptions): Promise<void> {
    try {
    const data = {
        value,
        timestamp: Date.now(),
        expiry: options?.expire ? Date.now() + options.expire : null
    };

    let serializedData = JSON.stringify(data);

    if (options?.encrypt) {
        serializedData = await this.encrypt(serializedData);
    }

    if (options?.compress) {
        serializedData = await this.compress(serializedData);
    }

    await AsyncStorage.setItem(key, serializedData);
    } catch (error) {
    console.error('Error setting item:', error);
    throw error;
    }
}

async getItem<T>(key: string): Promise<T | null> {
    try {
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;

    let parsed = JSON.parse(data);

    if (parsed.expiry && Date.now() > parsed.expiry) {
        await this.removeItem(key);
        return null;
    }

    if (parsed.compressed) {
        parsed.value = await this.decompress(parsed.value);
    }

    if (parsed.encrypted) {
        parsed.value = await this.decrypt(parsed.value);
    }

    return parsed.value as T;
    } catch (error) {
    console.error('Error getting item:', error);
    throw error;
    }
}

async removeItem(key: string): Promise<void> {
    try {
    await AsyncStorage.removeItem(key);
    } catch (error) {
    console.error('Error removing item:', error);
    throw error;
    }
}

async clear(): Promise<void> {
    try {
    await AsyncStorage.clear();
    await this.sqlite.executeSql('DELETE FROM cache');
    await this.sqlite.executeSql('DELETE FROM metadata');
    } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
    }
}

async getStorageMetrics(): Promise<StorageMetrics> {
    try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;

    for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
        totalSize += value.length;
        }
    }

    return {
        usage: totalSize,
        quota: this.QUOTA_LIMIT,
        items: keys.length
    };
    } catch (error) {
    console.error('Error getting storage metrics:', error);
    throw error;
    }
}

private async encrypt(data: string): Promise<string> {
    // Implementation of encryption using expo-crypto
    // This is a placeholder for actual encryption implementation
    return data;
}

private async decrypt(data: string): Promise<string> {
    // Implementation of decryption using expo-crypto
    // This is a placeholder for actual decryption implementation
    return data;
}

private async compress(data: string): Promise<string> {
    // Implementation of compression
    // This is a placeholder for actual compression implementation
    return data;
}

private async decompress(data: string): Promise<string> {
    // Implementation of decompression
    // This is a placeholder for actual decompression implementation
    return data;
}

async cleanup(): Promise<void> {
    try {
    const keys = await AsyncStorage.getAllKeys();
    const expired = [];

    for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
        const parsed = JSON.parse(data);
        if (parsed.expiry && Date.now() > parsed.expiry) {
            expired.push(key);
        }
        }
    }

    if (expired.length > 0) {
        await AsyncStorage.multiRemove(expired);
    }

    // Cleanup SQLite cache
    await this.sqlite.executeSql(
        'DELETE FROM cache WHERE expiry < ?',
        [Date.now()]
    );
    } catch (error) {
    console.error('Error during storage cleanup:', error);
    throw error;
    }
}
}

