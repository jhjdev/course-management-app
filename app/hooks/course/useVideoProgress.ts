import { useState, useEffect, useCallback } from 'react';

interface VideoProgress {
currentTime: number;
duration: number;
progress: number;
isBuffering: boolean;
}

interface UseVideoProgressReturn extends VideoProgress {
isLoading: boolean;
error: Error | null;
handleTimeUpdate: (time: number) => void;
handleDurationChange: (duration: number) => void;
}

/**
* Hook to manage video playback progress
* @param videoUrl - URL of the video being played
* @param courseId - ID of the course the video belongs to
* @returns Object containing video progress state and handler functions
*/
export const useVideoProgress = (
videoUrl: string,
courseId: string
): UseVideoProgressReturn => {
const [progress, setProgress] = useState<VideoProgress>({
    currentTime: 0,
    duration: 0,
    progress: 0,
    isBuffering: false
});
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

/**
* Updates the current playback time and calculates progress
*/
const handleTimeUpdate = useCallback((currentTime: number) => {
    setProgress(prev => ({
    ...prev,
    currentTime,
    progress: prev.duration ? (currentTime / prev.duration) * 100 : 0
    }));
}, []);

/**
* Updates video duration and recalculates progress
*/
const handleDurationChange = useCallback((duration: number) => {
    setProgress(prev => ({
    ...prev,
    duration,
    progress: duration ? (prev.currentTime / duration) * 100 : 0
    }));
}, []);

useEffect(() => {
    let mounted = true;

    const initializeVideo = async () => {
    try {
        setIsLoading(true);
        
        // Here you could add validation of the video URL
        // or fetch additional metadata if needed
        
        if (mounted) {
        setIsLoading(false);
        }
    } catch (err) {
        if (mounted) {
        setError(err instanceof Error ? err : new Error('Failed to load video'));
        setIsLoading(false);
        }
    }
    };

    initializeVideo();

    return () => {
    mounted = false;
    };
}, [videoUrl, courseId]);

return {
    ...progress,
    isLoading,
    error,
    handleTimeUpdate,
    handleDurationChange
};
};

