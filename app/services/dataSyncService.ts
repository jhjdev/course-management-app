import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { compress, decompress } from 'react-native-compressor';

interface SyncState {
lastSyncTimestamp: number;
isSyncing: boolean;
syncQueue: SyncQueueItem[];
offlineChanges: OfflineChange[];
syncStatus: SyncStatus;
}

interface SyncQueueItem {
id: string;
entity: string;
action: 'create' | 'update' | 'delete';
data: any;
timestamp: number;
retryCount: number;
}

interface OfflineChange {
id: string;
changes: any;
timestamp: number;
}

interface SyncStatus {
progress: number;
error: string | null;
lastSync: number;
}

export class DataSyncService {
private syncState: SyncState;
private readonly maxRetries = 3;
private readonly syncInterval = 5 * 60 * 1000; // 5 minutes
private readonly compressionThreshold = 1024; // 1KB

constructor() {
    this.syncState = {
    lastSyncTimestamp: 0,
    isSyncing: false,
    syncQueue: [],
    offlineChanges: [],
    syncStatus: {
        progress: 0,
        error: null,
        lastSync: 0
    }
    };

    this.initializeSync();
}

private async initializeSync() {
    await this.loadSyncState();
    this.setupNetworkListener();
    this.startPeriodicSync();
}

private async loadSyncState() {
    try {
    const state = await AsyncStorage.getItem('syncState');
    if (state) {
        this.syncState = JSON.parse(state);
    }
    } catch (error) {
    console.error('Error loading sync state:', error);
    }
}

private setupNetworkListener() {
    NetInfo.addEventListener(state => {
    if (state.isConnected && this.syncState.syncQueue.length > 0) {
        this.processSyncQueue();
    }
    });
}

private startPeriodicSync() {
    setInterval(() => {
    this.performSync();
    }, this.syncInterval);
}

public async performSync() {
    if (this.syncState.isSyncing) return;

    try {
    this.syncState.isSyncing = true;
    await this.updateSyncStatus({ progress: 0, error: null });

    // Get changes since last sync
    const serverChanges = await this.fetchServerChanges(this.syncState.lastSyncTimestamp);
    const localChanges = this.syncState.offlineChanges;

    // Resolve conflicts
    const resolvedChanges = await this.resolveConflicts(serverChanges, localChanges);

    // Apply changes
    await this.applyChanges(resolvedChanges);

    // Update sync state
    this.syncState.lastSyncTimestamp = Date.now();
    this.syncState.offlineChanges = [];
    await this.saveSyncState();

    await this.updateSyncStatus({ progress: 100, lastSync: Date.now() });
    } catch (error) {
    await this.updateSyncStatus({ error: error.message });
    } finally {
    this.syncState.isSyncing = false;
    }
}

private async processSyncQueue() {
    for (const item of this.syncState.syncQueue) {
    try {
        await this.syncQueueItem(item);
        this.removeFromQueue(item.id);
    } catch (error) {
        if (item.retryCount < this.maxRetries) {
        item.retryCount++;
        } else {
        this.removeFromQueue(item.id);
        this.handleSyncError(error, item);
        }
    }
    }
}

public async enqueueSyncItem(entity: string, action: 'create' | 'update' | 'delete', data: any) {
    const item: SyncQueueItem = {
    id: generateUniqueId(),
    entity,
    action,
    data,
    timestamp: Date.now(),
    retryCount: 0
    };

    this.syncState.syncQueue.push(item);
    await this.saveSyncState();

    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
    this.processSyncQueue();
    }
}

private async updateSyncStatus(status: Partial<SyncStatus>) {
    this.syncState.syncStatus = { ...this.syncState.syncStatus, ...status };
    await this.saveSyncState();
}

public async getOfflineData(entity: string): Promise<any> {
    try {
    const data = await AsyncStorage.getItem(`offline_${entity}`);
    return data ? JSON.parse(data) : null;
    } catch (error) {
    console.error(`Error getting offline data for ${entity}:`, error);
    return null;
    }
}

public async saveOfflineData(entity: string, data: any) {
    try {
    const compressed = await this.compressData(data);
    await AsyncStorage.setItem(`offline_${entity}`, compressed);
    } catch (error) {
    console.error(`Error saving offline data for ${entity}:`, error);
    }
}

private async compressData(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    if (jsonString.length > this.compressionThreshold) {
    return await compress(jsonString);
    }
    return jsonString;
}

private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
}

// Redux slice for sync state management
export const syncSlice = createSlice({
name: 'sync',
initialState: {
    status: 'idle',
    progress: 0,
    error: null
},
reducers: {
    setSyncStatus: (state, action: PayloadAction<string>) => {
    state.status = action.payload;
    },
    setSyncProgress: (state, action: PayloadAction<number>) => {
    state.progress = action.payload;
    },
    setSyncError: (state, action: PayloadAction<string | null>) => {
    state.error = action.payload;
    }
}
});

export const { setSyncStatus, setSyncProgress, setSyncError } = syncSlice.actions;
export default syncSlice.reducer;

