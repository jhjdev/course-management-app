/**
* Course Player Hooks
* 
* @module
* useVideoProgress - Hook for tracking video playback progress and duration
* usePlayerControls - Hook for controlling video playback (play/pause, volume, etc.)
* useSaveProgress - Hook for saving course progress to the backend
*/

export { useVideoProgress } from './useVideoProgress';
export { usePlayerControls } from './usePlayerControls';
export { useSaveProgress } from './useSaveProgress';

export type { VideoProgress, VideoState } from './useVideoProgress';
export type { PlayerControls, ControlsState } from './usePlayerControls';
export type { SaveProgressOptions, ProgressState } from './useSaveProgress';

