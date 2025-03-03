import { useState, useEffect, useRef } from 'react';
import { ProgressService } from '../../services/ProgressService';

/**
* Progress data structure for course progress
*/
interface Progress {
/** Current playback position in seconds */
currentTime: number;
/** Total duration in seconds */
duration: number;
/** Completion percentage (0-100) */
percentComplete: number;
}

/**
* Hook for saving course progress with debouncing
* @param courseId - ID of the current course
* @param progress - Current progress data
* @returns Object containing saving status and any errors
*/
export const useSaveProgress = (courseId: string, progress: Progress) => {
const [isSaving, setIsSaving] = useState(false);
const [error, setError] = useState<Error | null>(null);
const timeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
    const saveProgress = async () => {
    try {
        setIsSaving(true);
        setError(null);
        
        await ProgressService.saveProgress(courseId, {
        currentTime: progress.currentTime,
        duration: progress.duration,
        percentComplete: progress.percentComplete
        });

    } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to save progress'));
    } finally {
        setIsSaving(false);
    }
    };

    // Clear any existing timeout
    if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    }

    // Set new debounced timeout
    timeoutRef.current = setTimeout(saveProgress, 5000);

    // Cleanup on unmount
    return () => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    };
}, [courseId, progress.currentTime, progress.duration, progress.percentComplete]);

return {
    isSaving,
    error
};
};

