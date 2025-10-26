import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import '../styles/VoiceMessagePlayer.css';

const VoiceMessagePlayer = ({ audioUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
            console.log('🎵 Audio cargado, duración:', audio.duration, 'segundos');
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audioUrl]);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play();
            setIsPlaying(true);
        }
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * duration;
        
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="voice-message-player">
            <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                style={{ display: 'none' }}
            >
                <source src={audioUrl} type="audio/webm" />
                <source src={audioUrl} type="audio/mpeg" />
                <source src={audioUrl} type="audio/mp3" />
                <source src={audioUrl} type="audio/wav" />
                <source src={audioUrl} type="audio/ogg" />
            </audio>

            <button 
                className="voice-play-button" 
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
                {isPlaying ? <FaPause /> : <FaPlay />}
            </button>

            <div className="voice-progress-container">
                <div 
                    className="voice-progress-bar" 
                    onClick={handleSeek}
                >
                    <div 
                        className="voice-progress-fill" 
                        style={{ width: `${progress}%` }}
                    />
                    <div 
                        className="voice-progress-thumb" 
                        style={{ left: `${progress}%` }}
                    />
                </div>
                <div className="voice-time-display">
                    <span className="voice-current-time">{formatTime(currentTime)}</span>
                    <span className="voice-duration">{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default VoiceMessagePlayer;
