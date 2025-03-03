import { Platform } from 'react-native';
import { AVPlaybackStatus, Audio, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MediaConfig {
maxCacheSize: number; // in bytes
defaultQuality: 'auto' | 'low' | 'medium' | 'high';
offlineAccess: boolean;
backgroundPlayback: boolean;
}

interface MediaState {
currentTime: number;
duration: number;
isPlaying: boolean;
isBuffering: boolean;
playbackQuality: string;
}

class MediaService {
private config: MediaConfig;
private mediaStates: Map<string, MediaState>;
private downloadQueue: string[];

constructor(config: MediaConfig) {
    this.config = config;
    this.mediaStates = new Map();
    this.downloadQueue = [];
    this.initializeAudio();
}

private async initializeAudio() {
    await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: this.config.backgroundPlayback,
    interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
    interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    });
}

async loadVideo(videoUri: string, options = { shouldPlay: true }): Promise<void> {
    try {
    const cachedUri = await this.getCachedMedia(videoUri);
    const uri = cachedUri || videoUri;
    
    const { isConnected } = await NetInfo.fetch();
    const quality = isConnected ? this.config.defaultQuality : 'low';

    await Video.createAsync(
        { uri },
        { shouldPlay: options.shouldPlay, quality },
        (status: AVPlaybackStatus) => this.handlePlaybackStatusUpdate(videoUri, status)
    );

    if (!cachedUri && this.config.offlineAccess) {
        this.queueDownload(videoUri);
    }
    } catch (error) {
    throw new Error(`Failed to load video: ${error.message}`);
    }
}

private async handlePlaybackStatusUpdate(
    mediaId: string, 
    status: AVPlaybackStatus
): Promise<void> {
    if (!status.isLoaded) return;

    const mediaState: MediaState = {
    currentTime: status.positionMillis,
    duration: status.durationMillis,
    isPlaying: status.isPlaying,
    isBuffering: status.isBuffering,
    playbackQuality: this.config.defaultQuality,
    };

    this.mediaStates.set(mediaId, mediaState);
    await this.persistPlaybackState(mediaId, mediaState);
}

private async persistPlaybackState(
    mediaId: string, 
    state: MediaState
): Promise<void> {
    try {
    await AsyncStorage.setItem(
        `@media_state_${mediaId}`,
        JSON.stringify(state)
    );
    } catch (error) {
    console.error('Failed to persist media state:', error);
    }
}

private async getCachedMedia(uri: string): Promise<string | null> {
    try {
    const cacheDir = `${FileSystem.cacheDirectory}media/`;
    const fileName = uri.split('/').pop();
    const filePath = `${cacheDir}${fileName}`;

    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists ? filePath : null;
    } catch (error) {
    console.error('Cache check failed:', error);
    return null;
    }
}

private async queueDownload(uri: string): Promise<void> {
    if (this.downloadQueue.includes(uri)) return;

    this.downloadQueue.push(uri);
    this.processDownloadQueue();
}

private async processDownloadQueue(): Promise<void> {
    if (!this.downloadQueue.length) return;

    const uri = this.downloadQueue[0];
    const cacheDir = `${FileSystem.cacheDirectory}media/`;
    const fileName = uri.split('/').pop();
    const filePath = `${cacheDir}${fileName}`;

    try {
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    await FileSystem.downloadAsync(uri, filePath);
    
    this.downloadQueue.shift();
    this.processDownloadQueue();
    } catch (error) {
    console.error('Download failed:', error);
    this.downloadQueue.shift();
    this.processDownloadQueue();
    }
}

async cleanCache(): Promise<void> {
    try {
    const cacheDir = `${FileSystem.cacheDirectory}media/`;
    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    } catch (error) {
    throw new Error(`Failed to clean cache: ${error.message}`);
    }
}

// Public API methods
async play(mediaId: string): Promise<void> {
    // Implementation
}

async pause(mediaId: string): Promise<void> {
    // Implementation
}

async seek(mediaId: string, position: number): Promise<void> {
    // Implementation
}

async setQuality(mediaId: string, quality: string): Promise<void> {
    // Implementation
}

getPlaybackState(mediaId: string): MediaState | undefined {
    return this.mediaStates.get(mediaId);
}
}

export default MediaService;

