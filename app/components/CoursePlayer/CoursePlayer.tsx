import React, { useRef, useCallback, useMemo } from 'react';
import {
useVideoProgress,
usePlayerControls,
useSaveProgress
} from '../../hooks/course';
import {
Container,
VideoContainer,
Controls,
ProgressBar,
ProgressFill,
PlayButton,
TimeDisplay,
VolumeControl,
FullscreenButton,
ErrorContainer,
LoadingSpinner
} from './styles';

interface CoursePlayerProps {
courseId: string;
videoUrl: string;
onComplete?: () => void;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({
courseId,
videoUrl,
onComplete
}) => {
const videoRef = useRef<HTMLVideoElement>(null);

const {
    currentTime,
    duration,
    progress,
    isLoading,
    error: progressError
} = useVideoProgress(videoUrl);

const {
    isPlaying,
    volume,
    playbackRate,
    togglePlay,
    handleVolumeChange,
    handleSeek,
    toggleFullscreen,
    error: controlsError
} = usePlayerControls(videoRef);

const { 
    isSaving,
    error: saveError,
    handleProgressUpdate 
} = useSaveProgress(courseId);

const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    handleSeek(percent * duration);
}, [duration, handleSeek]);

const formattedTime = useMemo(() => {
    const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    return `${formatTime(currentTime)} / ${formatTime(duration)}`;
}, [currentTime, duration]);

const error = progressError || controlsError || saveError;

if (error) {
    return (
    <ErrorContainer>
        <p>Error: {error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
    </ErrorContainer>
    );
}

return (
    <Container>
    {isLoading && <LoadingSpinner />}
    <VideoContainer>
        <video
        ref={videoRef}
        src={videoUrl}
        onTimeUpdate={() => {
            handleProgressUpdate(currentTime / duration);
            if (currentTime >= duration && onComplete) {
            onComplete();
            }
        }}
        />
    </VideoContainer>
    <Controls>
        <PlayButton onClick={togglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
        </PlayButton>
        <ProgressBar onClick={handleProgressClick}>
        <ProgressFill style={{ width: `${progress * 100}%` }} />
        </ProgressBar>
        <TimeDisplay>{formattedTime}</TimeDisplay>
        <VolumeControl
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        onChange={(e) => handleVolumeChange(Number(e.target.value))}
        />
        <FullscreenButton onClick={toggleFullscreen}>
        FullScreen
        </FullscreenButton>
    </Controls>
    </Container>
);
};

export default React.memo(CoursePlayer);

