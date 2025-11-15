import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaSmile, FaPaperPlane, FaTimes, FaImage, FaPaperclip, FaFilePdf, FaFileWord, FaFileExcel, FaFileVideo, FaFileAudio, FaFileArchive, FaFile, FaMicrophone, FaBars } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import socket from '../services/socketService';
import VoiceRecorder from './VoiceRecorder';
import '../App.css';

const MessageInput = ({ username, replyTo, setReplyTo, roomPin, roomInfo }) => {
    const [input, setInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [image, setImage] = useState(null);
    
    // Verificar si la sala es solo texto
    const isTextOnlyRoom = roomInfo?.type === 'text';
    
    // Handler para mostrar mensaje cuando se intenta usar funciones deshabilitadas
    const handleDisabledFeatureClick = () => {
        if (isTextOnlyRoom) {
            alert(
                '📝 SALA DE SOLO TEXTO\n\n' +
                'Esta sala está configurada para mensajes de texto únicamente.\n\n' +
                '🚫 Funciones deshabilitadas:\n' +
                '• Envío de archivos e imágenes\n' +
                '• Mensajes de voz\n' +
                '• Documentos y multimedia\n\n' +
                '✅ Funciones disponibles:\n' +
                '• Mensajes de texto\n' +
                '• Emojis\n' +
                '• Responder mensajes\n\n' +
                'Para usar todas las funcionalidades, únete a una sala multimedia.'
            );
        }
    };
    const [imagePreview, setImagePreview] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const emojiPickerRef = useRef(null);
    const attachMenuRef = useRef(null);

    const addEmojiToInput = (emojiObject) => {
        setInput((prev) => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const sendMessage = async () => {
        if (!input.trim() && !image) return;
        let imageUrl = null;

        if (image) {
            setIsUploading(true);
            setUploadProgress('📤 Subiendo archivo...');
            
            const formData = new FormData();
            formData.append('file', image);
            formData.append('roomPin', roomPin || 'general');
            formData.append('username', username);
            
            try {
                setUploadProgress('🔍 Analizando seguridad del archivo...');
                
                // Usar el endpoint correcto que incluye análisis de seguridad
                const response = await axios.post(
                    `${process.env.REACT_APP_SOCKET_SERVER_URL}/api/upload`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
                
                imageUrl = response.data.fileUrl;
                console.log('✅ Archivo aprobado y subido:', imageUrl);
                
                // Mostrar información de seguridad
                if (response.data.securityCheck) {
                    console.log('🛡️ Análisis de seguridad:', response.data.securityCheck);
                    setUploadProgress('✅ Archivo verificado y seguro');
                    setTimeout(() => setUploadProgress(''), 2000);
                }
                
            } catch (error) {
                console.error('❌ Error al subir archivo:', error);
                console.error('Error details:', error.response?.data);
                setIsUploading(false);
                setUploadProgress('');
                
                if (error.response?.status === 403) {
                    // Archivo rechazado por razones de seguridad
                    const errorData = error.response.data;
                    alert(
                        `🚫 Archivo rechazado por seguridad\n\n` +
                        `Razón: ${errorData.error}\n` +
                        `Severidad: ${errorData.severity || 'Alta'}\n` +
                        `Puntaje de riesgo: ${errorData.riskScore || 'N/A'}\n\n` +
                        `Detalles: ${errorData.details?.riskFactors?.join(', ') || 'Contenido sospechoso detectado'}\n\n` +
                        `Por favor, verifica el archivo e intenta con uno diferente.`
                    );
                } else if (error.response?.status === 500) {
                    // Error del servidor
                    const errorData = error.response.data;
                    alert(
                        `❌ Error al procesar el archivo\n\n` +
                        `${errorData.error || 'Error interno del servidor'}\n` +
                        `${errorData.details ? '\nDetalles: ' + errorData.details : ''}\n\n` +
                        `Por favor, intenta de nuevo o contacta al soporte.`
                    );
                } else if (error.response?.status === 404) {
                    alert('❌ Sala no encontrada. Por favor, verifica que estés en una sala válida.');
                } else if (error.response?.data?.error) {
                    alert(`❌ Error: ${error.response.data.error}`);
                } else {
                    alert('❌ Error al subir el archivo. Por favor, intenta de nuevo.');
                }
                return;
            } finally {
                setIsUploading(false);
            }
        }

        const newMessage = {
            username,
            message: input,
            imageUrl,
            sticker: '',
            roomPin,
            replyTo: replyTo ? replyTo._id : null,
            timestamp: new Date().toISOString(),
        };

        console.log('📤 Enviando mensaje:', newMessage);
        
        // Emitir el mensaje a través del socket
        socket.emit('sendMessage', newMessage, (response) => {
            if (response && response.success) {
                console.log('✅ Mensaje enviado con éxito');
            } else {
                console.error('❌ Error al enviar el mensaje:', response?.error || 'Error desconocido');
                alert('Error al enviar el mensaje. Por favor, inténtalo de nuevo.');
            }
        });
        
        // Limpiar el formulario
        setInput('');
        setImage(null);
        setImagePreview(null);
        setReplyTo(null);
        setUploadProgress('');
        // Limpiar el input file
        const fileInput = document.getElementById('image-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Lista de tipos de archivo permitidos
            const allowedTypes = {
                // Imágenes
                'image/jpeg': 'Imagen JPEG',
                'image/jpg': 'Imagen JPG', 
                'image/png': 'Imagen PNG',
                'image/gif': 'Imagen GIF',
                'image/webp': 'Imagen WebP',
                'image/bmp': 'Imagen BMP',
                'image/svg+xml': 'Imagen SVG',
                // Documentos
                'application/pdf': 'Documento PDF',
                'application/msword': 'Documento Word',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Documento Word',
                'application/vnd.ms-excel': 'Hoja de Excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Hoja de Excel',
                'application/vnd.ms-powerpoint': 'Presentación PowerPoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'Presentación PowerPoint',
                'text/plain': 'Archivo de Texto',
                // Videos
                'video/mp4': 'Video MP4',
                'video/avi': 'Video AVI',
                'video/quicktime': 'Video MOV',
                'video/x-msvideo': 'Video AVI',
                'video/x-matroska': 'Video MKV',
                // Audios
                'audio/mpeg': 'Audio MP3',
                'audio/mp3': 'Audio MP3',
                'audio/wav': 'Audio WAV',
                'audio/ogg': 'Audio OGG',
                'audio/x-m4a': 'Audio M4A',
                // Archivos comprimidos
                'application/zip': 'Archivo ZIP',
                'application/x-zip-compressed': 'Archivo ZIP',
                'application/x-rar-compressed': 'Archivo RAR',
                'application/x-7z-compressed': 'Archivo 7Z'
            };

            // Archivos bloqueados explícitamente (ejecutables)
            const blockedTypes = [
                'application/x-msdownload',
                'application/x-msdos-program',
                'application/x-executable',
                'application/x-bat',
                'application/x-sh',
                'application/x-shellscript'
            ];

            // Verificar si es un archivo bloqueado
            if (blockedTypes.includes(file.type) || 
                file.name.match(/\.(exe|bat|cmd|sh|app|msi|dll|scr|vbs|js|jar|com|pif)$/i)) {
                alert(
                    '🚫 ARCHIVO NO PERMITIDO POR SEGURIDAD\n\n' +
                    `El archivo "${file.name}" está bloqueado por razones de seguridad.\n\n` +
                    '⚠️ Los archivos ejecutables no están permitidos.\n\n' +
                    'Tipos permitidos:\n' +
                    '• 📷 Imágenes (JPG, PNG, GIF, WebP, BMP, SVG)\n' +
                    '• 📄 Documentos (PDF, DOC, XLS, PPT, TXT)\n' +
                    '• 🎬 Videos (MP4, AVI, MOV, MKV)\n' +
                    '• 🎵 Audio (MP3, WAV, OGG, M4A)\n' +
                    '• 🗜️ Comprimidos (ZIP, RAR, 7Z)'
                );
                e.target.value = '';
                return;
            }

            // Verificar si el tipo está en la lista de permitidos
            if (!allowedTypes[file.type]) {
                alert(
                    '⚠️ TIPO DE ARCHIVO NO SOPORTADO\n\n' +
                    `El archivo "${file.name}" (${file.type || 'tipo desconocido'}) no está en la lista de archivos permitidos.\n\n` +
                    'Tipos permitidos:\n' +
                    '• 📷 Imágenes (JPG, PNG, GIF, WebP, BMP, SVG)\n' +
                    '• 📄 Documentos (PDF, DOC, XLS, PPT, TXT)\n' +
                    '• 🎬 Videos (MP4, AVI, MOV, MKV)\n' +
                    '• 🎵 Audio (MP3, WAV, OGG, M4A)\n' +
                    '• 🗜️ Comprimidos (ZIP, RAR, 7Z)\n\n' +
                    'Si crees que este archivo debería estar permitido, contacta al administrador.'
                );
                e.target.value = '';
                return;
            }
            
            // Validar tamaño del archivo (10MB máximo)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                alert(
                    '📦 ARCHIVO DEMASIADO GRANDE\n\n' +
                    `El archivo "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)}MB) excede el tamaño máximo permitido.\n\n` +
                    '⚠️ Tamaño máximo: 10MB\n\n' +
                    'Por favor, comprime el archivo o elige uno más pequeño.'
                );
                e.target.value = '';
                return;
            }
            
            console.log(`✅ Archivo validado: ${file.name} (${allowedTypes[file.type]})`);
            
            setImage(file);
            setFileType(getFileType(file.type));
            
            // Crear URL de previsualización solo para imágenes
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result);
                };
                reader.readAsDataURL(file);
            } else {
                // Para otros archivos, guardar el tipo
                setImagePreview(null);
            }
            
            setShowAttachMenu(false);
        }
    };
    
    const getFileType = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'excel';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return 'archive';
        return 'file';
    };
    
    const getFileIcon = (type) => {
        switch (type) {
            case 'pdf': return <FaFilePdf className="file-icon pdf" />;
            case 'word': return <FaFileWord className="file-icon word" />;
            case 'excel': return <FaFileExcel className="file-icon excel" />;
            case 'video': return <FaFileVideo className="file-icon video" />;
            case 'audio': return <FaFileAudio className="file-icon audio" />;
            case 'archive': return <FaFileArchive className="file-icon archive" />;
            default: return <FaFile className="file-icon default" />;
        }
    };
    
    const handleAttachClick = (type) => {
        const fileInput = document.getElementById(`file-upload-${type}`);
        if (fileInput) {
            fileInput.click();
        }
    };

    const cancelImage = () => {
        setImage(null);
        setImagePreview(null);
        setFileType(null);
        // Limpiar todos los inputs file
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => input.value = '');
    };

    const cancelReply = () => {
        setReplyTo(null);
    };
    
    const handleVoiceSend = async (voiceBlob) => {
        console.log('🎤 Enviando mensaje de voz...', voiceBlob);
        setIsUploading(true);
        setUploadProgress('📤 Subiendo mensaje de voz...');
        
        const formData = new FormData();
        // Crear archivo desde el blob
        const voiceFile = new File([voiceBlob], `voice-message-${Date.now()}.webm`, {
            type: voiceBlob.type || 'audio/webm'
        });
        formData.append('file', voiceFile);
        formData.append('roomPin', roomPin || 'general');
        formData.append('username', username);
        
        try {
            setUploadProgress('🔍 Analizando mensaje de voz...');
            
            const response = await axios.post(
                `${process.env.REACT_APP_SOCKET_SERVER_URL}/api/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            const audioUrl = response.data.fileUrl;
            console.log('✅ Mensaje de voz subido:', audioUrl);
            
            const newMessage = {
                username,
                message: '🎤 Mensaje de voz',
                imageUrl: audioUrl,
                sticker: '',
                roomPin,
                replyTo: replyTo ? replyTo._id : null,
                timestamp: new Date().toISOString(),
                isVoiceMessage: true, // Identificar como mensaje de voz grabado
            };

            socket.emit('sendMessage', newMessage, (response) => {
                if (response && response.success) {
                    console.log('✅ Mensaje de voz enviado con éxito');
                    setUploadProgress('✅ Mensaje de voz enviado');
                    setTimeout(() => setUploadProgress(''), 2000);
                } else {
                    console.error('❌ Error al enviar el mensaje de voz:', response?.error || 'Error desconocido');
                    alert('Error al enviar el mensaje de voz. Por favor, inténtalo de nuevo.');
                }
            });
            
            setReplyTo(null);
            setShowVoiceRecorder(false);
            
        } catch (error) {
            console.error('❌ Error al subir mensaje de voz:', error);
            
            if (error.response?.status === 403) {
                const errorData = error.response.data;
                alert(
                    `🚫 Mensaje de voz rechazado por seguridad\n\n` +
                    `Razón: ${errorData.error}\n` +
                    `Severidad: ${errorData.severity || 'Alta'}\n\n` +
                    `Por favor, intenta grabar de nuevo.`
                );
            } else {
                alert('❌ Error al subir el mensaje de voz. Por favor, intenta de nuevo.');
            }
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target) &&
                event.target.className !== 'emoji-button' &&
                !event.target.closest('.mobile-action-button.emoji')
            ) {
                setShowEmojiPicker(false);
            }
            
            if (
                attachMenuRef.current &&
                !attachMenuRef.current.contains(event.target) &&
                !event.target.closest('.attach-button') &&
                !event.target.closest('.mobile-action-button.attach')
            ) {
                setShowAttachMenu(false);
            }
            
            // Cerrar menú móvil al hacer clic fuera
            if (
                showMobileMenu &&
                !event.target.closest('.mobile-menu-button') &&
                !event.target.closest('.mobile-action-menu')
            ) {
                setShowMobileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMobileMenu]);

    // Asegúrate de que el input de archivo esté correctamente configurado
    return (
        <div className="message-input">
            {/* Indicador de análisis de seguridad */}
            {isUploading && (
                <div className="security-analysis-indicator">
                    <div className="security-spinner"></div>
                    <span>{uploadProgress}</span>
                </div>
            )}
            
            {/* Previsualización de imagen */}
            {image && !isUploading && (
                <div className="image-preview-container">
                    <div className="image-preview-wrapper">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="image-preview" />
                        ) : (
                            <div className="file-preview">
                                {getFileIcon(fileType)}
                                <span className="file-name">{image?.name}</span>
                                <span className="file-size">
                                    {(image?.size / 1024).toFixed(2)} KB
                                </span>
                            </div>
                        )}
                        <button className="cancel-image-button" onClick={cancelImage} title="Eliminar archivo">
                            <FaTimes />
                        </button>
                    </div>
                    <p className="image-preview-label">
                        {imagePreview ? 'Vista previa de la imagen' : 'Archivo adjunto'}
                        <span className="security-badge">🛡️ Se analizará al enviar</span>
                    </p>
                </div>
            )}
            
            {replyTo && (
                <div className="reply-preview">
                    Respondiendo a: {replyTo.username} - "{replyTo.message}"
                    <button className="cancel-reply-button" onClick={cancelReply}>
                        <FaTimes />
                    </button>
                </div>
            )}
            
            <div className="message-input-wrapper">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe un mensaje..."
                    className="input-box"
                />
                
                {/* Botón hamburguesa para móviles */}
                <button
                    className="mobile-menu-button"
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    title="Más opciones"
                >
                    <FaBars />
                </button>
                
                {/* Botones para desktop */}
                <div className="desktop-buttons">
                    <button
                        className="emoji-button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Emojis"
                    >
                        <FaSmile />
                    </button>
                    
                    <button
                        className={`attach-button ${isTextOnlyRoom ? 'disabled' : ''}`}
                        onClick={() => isTextOnlyRoom ? handleDisabledFeatureClick() : setShowAttachMenu(!showAttachMenu)}
                        title={isTextOnlyRoom ? "📝 Sala de solo texto - Archivos deshabilitados" : "Adjuntar archivo"}
                        disabled={isTextOnlyRoom}
                    >
                        <FaPaperclip />
                    </button>
                    
                    <button
                        className={`voice-button ${isTextOnlyRoom ? 'disabled' : ''}`}
                        onClick={() => isTextOnlyRoom ? handleDisabledFeatureClick() : setShowVoiceRecorder(true)}
                        title={isTextOnlyRoom ? "📝 Sala de solo texto - Audio deshabilitado" : "Grabar mensaje de voz"}
                        disabled={isTextOnlyRoom}
                    >
                        <FaMicrophone />
                    </button>
                </div>
                
                <button onClick={sendMessage} className="send-button" disabled={isUploading}>
                    <FaPaperPlane />
                </button>
            </div>
            
            {/* Menú móvil desplegable */}
            {showMobileMenu && (
                <div className="mobile-action-menu">
                    <button
                        className="mobile-action-button emoji"
                        onClick={() => {
                            setShowEmojiPicker(!showEmojiPicker);
                            setShowMobileMenu(false);
                        }}
                    >
                        <FaSmile /> <span>Emojis</span>
                    </button>
                    <button
                        className={`mobile-action-button attach ${isTextOnlyRoom ? 'disabled' : ''}`}
                        onClick={() => {
                            if (isTextOnlyRoom) {
                                handleDisabledFeatureClick();
                            } else {
                                setShowAttachMenu(!showAttachMenu);
                                setShowMobileMenu(false);
                            }
                        }}
                        disabled={isTextOnlyRoom}
                        title={isTextOnlyRoom ? "Sala de solo texto" : "Archivos"}
                    >
                        <FaPaperclip /> <span>Archivos {isTextOnlyRoom && '🔒'}</span>
                    </button>
                    <button
                        className={`mobile-action-button voice ${isTextOnlyRoom ? 'disabled' : ''}`}
                        onClick={() => {
                            if (isTextOnlyRoom) {
                                handleDisabledFeatureClick();
                            } else {
                                setShowVoiceRecorder(true);
                                setShowMobileMenu(false);
                            }
                        }}
                        disabled={isTextOnlyRoom}
                        title={isTextOnlyRoom ? "Sala de solo texto" : "Audio"}
                    >
                        <FaMicrophone /> <span>Audio {isTextOnlyRoom && '🔒'}</span>
                    </button>
                </div>
            )}
            
            {/* Menú de adjuntos tipo WhatsApp - deshabilitado en salas de solo texto */}
            {showAttachMenu && !isTextOnlyRoom && (
                <div className="attach-menu" ref={attachMenuRef}>
                    <div className="attach-option" onClick={() => handleAttachClick('image')}>
                        <div className="attach-icon image-icon">
                            <FaImage />
                        </div>
                        <span>Imágenes</span>
                    </div>
                    <div className="attach-option" onClick={() => handleAttachClick('document')}>
                        <div className="attach-icon document-icon">
                            <FaFilePdf />
                        </div>
                        <span>Documentos</span>
                    </div>
                    <div className="attach-option" onClick={() => handleAttachClick('video')}>
                        <div className="attach-icon video-icon">
                            <FaFileVideo />
                        </div>
                        <span>Videos</span>
                    </div>
                    <div className="attach-option" onClick={() => handleAttachClick('audio')}>
                        <div className="attach-icon audio-icon">
                            <FaFileAudio />
                        </div>
                        <span>Audios</span>
                    </div>
                    <div className="attach-option" onClick={() => handleAttachClick('file')}>
                        <div className="attach-icon file-icon">
                            <FaFileArchive />
                        </div>
                        <span>Comprimidos</span>
                    </div>
                </div>
            )}
            
            {/* Inputs ocultos para diferentes tipos de archivos - deshabilitados en salas de solo texto */}
            <input
                id="file-upload-image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                disabled={isUploading || isTextOnlyRoom}
            />
            <input
                id="file-upload-document"
                type="file"
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                disabled={isUploading || isTextOnlyRoom}
            />
            <input
                id="file-upload-video"
                type="file"
                accept="video/mp4,video/avi,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.avi,.mov,.mkv"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                disabled={isUploading || isTextOnlyRoom}
            />
            <input
                id="file-upload-audio"
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/x-m4a,.mp3,.wav,.ogg,.m4a"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                disabled={isUploading || isTextOnlyRoom}
            />
            <input
                id="file-upload-file"
                type="file"
                accept="application/zip,application/x-zip-compressed,application/x-rar-compressed,application/x-7z-compressed,.zip,.rar,.7z"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                disabled={isUploading || isTextOnlyRoom}
            />
            
            {showEmojiPicker && (
                <div className="emoji-picker-container" ref={emojiPickerRef}>
                    <EmojiPicker onEmojiClick={addEmojiToInput} />
                </div>
            )}
            
            {/* Grabadora de voz - deshabilitada en salas de solo texto */}
            {showVoiceRecorder && !isTextOnlyRoom && (
                <VoiceRecorder
                    onCancel={() => setShowVoiceRecorder(false)}
                    onSendVoice={handleVoiceSend}
                />
            )}
        </div>
    );
};

export default MessageInput;
