import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaTrash, FaPaperPlane } from 'react-icons/fa';
import '../styles/VoiceRecorder.css';

const VoiceRecorder = ({ onSendVoice, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        // Solicitar permisos de micrófono al montar
        requestMicrophonePermission();
        
        return () => {
            // Limpiar al desmontar
            console.log('🧹 Limpiando recursos...');
            
            // Detener timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            
            // Detener grabación
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            
            // Detener stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const requestMicrophonePermission = async () => {
        try {
            console.log('🎤 Solicitando permisos de micrófono...');
            
            // Verificar si el navegador soporta getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('❌ Tu navegador no soporta la grabación de audio.\n\nPor favor, usa Chrome, Firefox, Edge o Safari actualizado.');
                onCancel();
                return;
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            console.log('✅ Permisos concedidos, stream obtenido');
            streamRef.current = stream;
            
            // Iniciar grabación automáticamente
            startRecording();
        } catch (error) {
            console.error('❌ Error al acceder al micrófono:', error);
            
            let errorMessage = '❌ No se pudo acceder al micrófono.\n\n';
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage += 'Permisos denegados.\n\n';
                errorMessage += 'Por favor:\n';
                errorMessage += '1. Haz clic en el icono de candado/información en la barra de direcciones\n';
                errorMessage += '2. Permite el acceso al micrófono\n';
                errorMessage += '3. Recarga la página e intenta de nuevo';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage += 'No se encontró ningún micrófono.\n\n';
                errorMessage += 'Por favor:\n';
                errorMessage += '1. Conecta un micrófono a tu dispositivo\n';
                errorMessage += '2. Verifica que esté habilitado en la configuración del sistema\n';
                errorMessage += '3. Intenta de nuevo';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage += 'El micrófono está siendo usado por otra aplicación.\n\n';
                errorMessage += 'Por favor:\n';
                errorMessage += '1. Cierra otras aplicaciones que usen el micrófono\n';
                errorMessage += '2. Intenta de nuevo';
            } else {
                errorMessage += `Error: ${error.message}\n\n`;
                errorMessage += 'Por favor, verifica:\n';
                errorMessage += '• Has dado permisos de micrófono al navegador\n';
                errorMessage += '• No hay otra aplicación usando el micrófono\n';
                errorMessage += '• Tu navegador soporta grabación de audio';
            }
            
            alert(errorMessage);
            onCancel();
        }
    };

    const startRecording = () => {
        if (!streamRef.current) {
            console.error('❌ No hay stream disponible para grabar');
            alert('Error: No se pudo iniciar la grabación. Por favor, intenta de nuevo.');
            onCancel();
            return;
        }

        try {
            console.log('🎙️ Iniciando grabación...');
            chunksRef.current = [];
            
            // Intentar usar diferentes formatos según el navegador
            let mimeType = '';
            
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
                console.log('✅ Usando audio/webm;codecs=opus');
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
                console.log('✅ Usando audio/webm');
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
                console.log('✅ Usando audio/mp4');
            } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                mimeType = 'audio/ogg;codecs=opus';
                console.log('✅ Usando audio/ogg;codecs=opus');
            } else {
                console.log('⚠️ Usando formato por defecto del navegador');
            }

            const options = mimeType ? { mimeType } : {};
            mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
            
            // Variable para guardar el tipo MIME usado
            const usedMimeType = mediaRecorderRef.current.mimeType || mimeType || 'audio/webm';
            console.log('📋 MIME type del MediaRecorder:', usedMimeType);

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    console.log(`📦 Chunk recibido: ${event.data.size} bytes, tipo: ${event.data.type}`);
                    chunksRef.current.push(event.data);
                } else {
                    console.warn('⚠️ Chunk vacío o inválido recibido');
                }
            };

            mediaRecorderRef.current.onstart = () => {
                console.log('▶️ MediaRecorder.onstart - Grabación iniciada REALMENTE');
                console.log('🔊 Stream tracks:', streamRef.current.getTracks().map(t => ({
                    kind: t.kind,
                    label: t.label,
                    enabled: t.enabled,
                    muted: t.muted,
                    readyState: t.readyState
                })));
                
                // INICIAR EL TIMER AQUÍ - cuando realmente comienza la grabación
                console.log('⏱️ Iniciando timer sincronizado con grabación');
                startTimer();
            };

            mediaRecorderRef.current.onstop = () => {
                console.log('⏹️ MediaRecorder.onstop - Grabación detenida');
                console.log('⏱️ Tiempo final de grabación:', recordingTime, 'segundos');
                console.log(`📊 Total de chunks: ${chunksRef.current.length}`);
                
                // Detener el timer aquí también por si acaso
                stopTimer();
                
                if (chunksRef.current.length === 0) {
                    console.error('❌ No se capturó ningún chunk de audio');
                    alert('No se pudo grabar audio. Por favor, verifica que tu micrófono esté funcionando e intenta de nuevo.');
                    return;
                }
                
                // Usar el tipo MIME que realmente se usó
                const blob = new Blob(chunksRef.current, { 
                    type: usedMimeType
                });
                console.log(`✅ Audio Blob creado: ${blob.size} bytes, tipo: ${blob.type}`);
                
                if (blob.size === 0) {
                    console.error('❌ Blob de audio vacío');
                    alert('La grabación está vacía. Por favor, intenta de nuevo.');
                    return;
                }
                
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                console.log('✅ URL de preview creada:', url);
            };

            mediaRecorderRef.current.onerror = (event) => {
                console.error('❌ Error en MediaRecorder:', event.error);
                alert('Error durante la grabación. Por favor, intenta de nuevo.');
                stopTimer();
                onCancel();
            };

            console.log('🎬 Iniciando MediaRecorder con opciones:', options);
            
            // Intentar diferentes intervalos de timeslice
            try {
                mediaRecorderRef.current.start(1000); // Chunks cada 1 segundo
                console.log('📍 MediaRecorder.start(1000) - chunks cada 1 segundo');
            } catch (e) {
                console.warn('⚠️ No se pudo usar timeslice, iniciando sin él');
                mediaRecorderRef.current.start(); // Sin timeslice
            }
            
            console.log('📍 Estado después de start():', mediaRecorderRef.current.state);
            
            setIsRecording(true);
            // NO iniciar el timer aquí - se inicia en el evento onstart del MediaRecorder
            console.log('✅ MediaRecorder configurado, esperando evento onstart para iniciar timer');
            
            // Verificar estado después de un momento
            setTimeout(() => {
                if (mediaRecorderRef.current) {
                    console.log('🔍 Verificación post-inicio:');
                    console.log('  - Estado MediaRecorder:', mediaRecorderRef.current.state);
                    console.log('  - Stream activo:', streamRef.current?.active);
                    console.log('  - Chunks capturados hasta ahora:', chunksRef.current.length);
                    
                    const tracks = streamRef.current?.getTracks() || [];
                    tracks.forEach((track, idx) => {
                        console.log(`  - Track ${idx}:`, {
                            kind: track.kind,
                            label: track.label,
                            enabled: track.enabled,
                            muted: track.muted,
                            readyState: track.readyState
                        });
                    });
                }
            }, 1000);
        } catch (error) {
            console.error('❌ Error al iniciar grabación:', error);
            alert('Error al iniciar la grabación. Por favor, intenta de nuevo.');
            onCancel();
        }
    };

    const stopRecording = () => {
        console.log('🛑 Intentando detener grabación...');
        console.log('Estado del MediaRecorder:', mediaRecorderRef.current?.state);
        console.log('Tiempo de grabación actual:', recordingTime, 'segundos');
        console.log('Chunks capturados antes de detener:', chunksRef.current.length);
        
        // NO detener el timer aquí - se detendrá en el evento onstop
        
        // Detener grabación
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            console.log('🎙️ Deteniendo MediaRecorder...');
            
            // Solicitar último chunk antes de detener
            if (mediaRecorderRef.current.state === 'recording') {
                console.log('📦 Solicitando datos finales...');
                try {
                    mediaRecorderRef.current.requestData(); // Forzar último chunk
                } catch (e) {
                    console.warn('⚠️ No se pudo solicitar último chunk:', e);
                }
            }
            
            // Pequeño delay para asegurar que se procese el último chunk
            setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                    console.log('✅ MediaRecorder.stop() llamado - el evento onstop detendrá el timer');
                }
            }, 100);
        } else {
            console.log('⚠️ MediaRecorder ya está inactivo o no existe');
            // Si no hay MediaRecorder activo, detener el timer manualmente
            stopTimer();
        }
        
        setIsRecording(false);
        console.log('✅ isRecording = false');
    };

    const startTimer = () => {
        console.log('⏱️ Iniciando timer...');
        // Asegurarse de que no hay timer previo
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        timerRef.current = setInterval(() => {
            setRecordingTime(prev => {
                const newTime = prev + 1;
                console.log(`⏰ Tiempo: ${newTime}s`);
                return newTime;
            });
        }, 1000);
        console.log('✅ Timer iniciado');
    };

    const stopTimer = () => {
        console.log('⏱️ Deteniendo timer...');
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            console.log('✅ Timer detenido');
        } else {
            console.log('⚠️ Timer ya estaba detenido');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSend = () => {
        if (audioBlob) {
            console.log('📤 Enviando audio blob al componente padre');
            onSendVoice(audioBlob);  // Pasar el Blob directamente
        } else {
            console.error('❌ No hay audio blob para enviar');
            alert('Error: No hay audio grabado. Por favor, graba un mensaje primero.');
        }
    };

    const handleCancel = () => {
        console.log('❌ Cancelando grabación...');
        stopRecording();
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('🔇 Track de audio detenido');
            });
        }
        onCancel();
    };

    const handleDelete = () => {
        console.log('🗑️ Eliminando audio y reiniciando...');
        
        // Detener cualquier timer activo
        stopTimer();
        
        // Limpiar estados
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        
        // Limpiar chunks anteriores
        chunksRef.current = [];
        
        console.log('🔄 Reiniciando grabación...');
        // Reiniciar grabación
        startRecording();
    };

    return (
        <div className="voice-recorder-overlay">
            <div className="voice-recorder-container">
                <div className="voice-recorder-header">
                    <h3>🎤 Mensaje de voz</h3>
                    <button className="close-recorder" onClick={handleCancel}>
                        ✕
                    </button>
                </div>

                <div className="voice-recorder-content">
                    {/* Visualización de grabación */}
                    <div className="recording-visualization">
                        {isRecording ? (
                            <>
                                <div className="recording-pulse">
                                    <div className="pulse-circle pulse-1"></div>
                                    <div className="pulse-circle pulse-2"></div>
                                    <div className="pulse-circle pulse-3"></div>
                                    <FaMicrophone className="recording-icon" />
                                </div>
                                <p className="recording-status">Grabando...</p>
                            </>
                        ) : audioUrl ? (
                            <>
                                <div className="audio-ready-icon">
                                    <FaMicrophone />
                                </div>
                                <p className="recording-status">Listo para enviar</p>
                            </>
                        ) : null}
                    </div>

                    {/* Tiempo de grabación */}
                    <div className="recording-time">
                        {formatTime(recordingTime)}
                    </div>

                    {/* Reproductor de audio si ya se grabó */}
                    {audioUrl && !isRecording && (
                        <div className="voice-preview">
                            <audio controls src={audioUrl} className="voice-preview-player">
                                Tu navegador no soporta la reproducción de audio.
                            </audio>
                        </div>
                    )}

                    {/* Controles */}
                    <div className="recording-controls">
                        {isRecording ? (
                            <button 
                                className="control-button stop-button" 
                                onClick={stopRecording}
                                title="Detener grabación"
                            >
                                <FaStop />
                                <span>Detener</span>
                            </button>
                        ) : audioUrl ? (
                            <>
                                <button 
                                    className="control-button delete-button" 
                                    onClick={handleDelete}
                                    title="Eliminar y grabar de nuevo"
                                >
                                    <FaTrash />
                                    <span>Eliminar</span>
                                </button>
                                <button 
                                    className="control-button send-button" 
                                    onClick={handleSend}
                                    title="Enviar mensaje de voz"
                                >
                                    <FaPaperPlane />
                                    <span>Enviar</span>
                                </button>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="voice-recorder-footer">
                    <p className="voice-hint">
                        {isRecording 
                            ? '🎙️ Habla claramente hacia el micrófono' 
                            : audioUrl 
                            ? '🎧 Escucha tu mensaje antes de enviarlo'
                            : ''}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VoiceRecorder;
