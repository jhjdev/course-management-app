import { useCallback, useEffect, useState } from 'react'

export interface PlayerState {
isPlaying: boolean
volume: number
playbackRate: number
isFullscreen: boolean
isMuted: boolean
duration: number
currentTime: number
}

export interface PlayerControls {
play: () => Promise<void>
pause: () => void
togglePlay: () => Promise<void>
seek: (time: number) => void
setVolume: (volume: number) => void
toggleMute: () => void
setPlaybackRate: (rate: number) => void
toggleFullscreen: () => Promise<void>
}

/**
* Hook for controlling video playback
* @param videoRef - Reference to the video element
* @returns Object containing player state and control methods
*/
export const usePlayerControls = (videoRef: React.RefObject<HTMLVideoElement>): {
state: PlayerState
controls: PlayerControls
} => {
const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    volume: 1,
    playbackRate: 1,
    isFullscreen: false,
    isMuted: false,
    duration: 0,
    currentTime: 0
})

/**
* Play the video
*/
const play = useCallback(async () => {
    try {
    if (videoRef.current) {
        await videoRef.current.play()
        setState(prev => ({ ...prev, isPlaying: true }))
    }
    } catch (error) {
    console.error('Failed to play video:', error)
    }
}, [videoRef])

/**
* Pause the video
*/
const pause = useCallback(() => {
    if (videoRef.current) {
    videoRef.current.pause()
    setState(prev => ({ ...prev, isPlaying: false }))
    }
}, [videoRef])

/**
* Toggle play/pause state
*/
const togglePlay = useCallback(async () => {
    if (state.isPlaying) {
    pause()
    } else {
    await play()
    }
}, [state.isPlaying, play, pause])

/**
* Seek to specific time in the video
*/
const seek = useCallback((time: number) => {
    if (videoRef.current) {
    videoRef.current.currentTime = Math.max(0, Math.min(time, state.duration))
    setState(prev => ({ ...prev, currentTime: videoRef.current?.currentTime || 0 }))
    }
}, [videoRef, state.duration])

/**
* Set video volume (0-1)
*/
const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
    const newVolume = Math.max(0, Math.min(volume, 1))
    videoRef.current.volume = newVolume
    setState(prev => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }))
    }
}, [videoRef])

/**
* Toggle mute state
*/
const toggleMute = useCallback(() => {
    if (videoRef.current) {
    const newMuted = !state.isMuted
    videoRef.current.muted = newMuted
    setState(prev => ({ ...prev, isMuted: newMuted }))
    }
}, [videoRef, state.isMuted])

/**
* Set video playback rate
*/
const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
    videoRef.current.playbackRate = rate
    setState(prev => ({ ...prev, playbackRate: rate }))
    }
}, [videoRef])

/**
* Toggle fullscreen mode
*/
const toggleFullscreen = useCallback(async () => {
    try {
    if (!document.fullscreenElement && videoRef.current) {
        await videoRef.current.requestFullscreen()
        setState(prev => ({ ...prev, isFullscreen: true }))
    } else if (document.exitFullscreen) {
        await document.exitFullscreen()
        setState(prev => ({ ...prev, isFullscreen: false }))
    }
    } catch (error) {
    console.error('Failed to toggle fullscreen:', error)
    }
}, [videoRef])

// Update state when video metadata is loaded
useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
    setState(prev => ({
        ...prev,
        duration: video.duration,
        volume: video.volume,
        playbackRate: video.playbackRate,
        isMuted: video.muted
    }))
    }

    const handleTimeUpdate = () => {
    setState(prev => ({ ...prev, currentTime: video.currentTime }))
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
    video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    video.removeEventListener('timeupdate', handleTimeUpdate)
    }
}, [videoRef])

return {
    state,
    controls: {
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleFullscreen
    }
}
}

