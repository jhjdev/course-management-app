/**
* Video source configuration including quality options
*/
export interface VideoSource {
/** Main video URL */
url: string;
/** Video quality (e.g. 720p, 1080p) */
quality: string;
/** Video format (e.g. mp4, webm) */
format: string;
}

/**
* Course player component props
*/
export interface CoursePlayerProps {
/** Unique identifier for the course */
courseId: string;
/** Primary video URL */
videoUrl: string;
/** Alternative video sources */
sources?: VideoSource[];
/** Starting timestamp in seconds */
currentTime?: number;
/** Initial playback volume (0-1) */
initialVolume?: number;
/** Whether to autoplay the video */
autoPlay?: boolean;
/** Callback fired when progress updates */
onProgress: (progress: VideoProgress) => void;
/** Callback fired when video ends */
onComplete?: () => void;
/** Callback fired when player errors occur */
onError?: (error: Error) => void;
}

/**
* Video progress tracking information
*/
export interface VideoProgress {
/** Current playback position in seconds */
currentTime: number;
/** Total video duration in seconds */
duration: number;
/** Buffered ranges in seconds [[start, end], ...] */
buffered: [number, number][];
/** Whether video has completed playback */
completed: boolean;
/** Percentage of video watched (0-100) */
percentageWatched: number;
}

/**
* Player control actions
*/
export interface PlayerControls {
/** Play/pause toggle function */
togglePlay: () => void;
/** Seek to specific time in seconds */
seek: (time: number) => void;
/** Set volume level (0-1) */
setVolume: (level: number) => void;
/** Toggle mute state */
toggleMute: () => void;
/** Toggle fullscreen mode */
toggleFullscreen: () => void;
/** Toggle picture-in-picture mode */
togglePiP?: () => void;
/** Change playback speed */
setPlaybackSpeed: (speed: number) => void;
/** Show/hide captions */
toggleCaptions?: () => void;
}

/**
* Player state information
*/
export interface PlayerState {
/** Whether video is currently playing */
isPlaying: boolean;
/** Whether video is currently loading */
isLoading: boolean;
/** Whether player is in fullscreen mode */
isFullscreen: boolean;
/** Whether audio is muted */
isMuted: boolean;
/** Current volume level (0-1) */
volume: number;
/** Current playback speed */
playbackSpeed: number;
/** Whether captions are enabled */
captionsEnabled?: boolean;
}

/**
* Player quality settings
*/
export interface QualitySettings {
/** Available quality options */
qualities: string[];
/** Currently selected quality */
currentQuality: string;
/** Whether to use adaptive quality */
isAuto: boolean;
}

