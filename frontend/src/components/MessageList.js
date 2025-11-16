import React, { useEffect, useRef, useState } from 'react';
import { FaReply } from 'react-icons/fa';
import Linkify from 'react-linkify'; // Convierte texto en enlaces clickeables
import VoiceMessagePlayer from './VoiceMessagePlayer'; // Reproductor de audio personalizado
import '../styles/sendMessages.css';

const MessageList = ({ messages = [], onReply, username }) => {
    const messageEndRef = useRef(null);
    const [previews, setPreviews] = useState({}); // Almacena las previsualizaciones
    const [imageModal, setImageModal] = useState({ show: false, url: '' }); // Estado para modal de imagen

    // Log cuando cambian los mensajes
    useEffect(() => {
        console.log(' Mensajes en MessageList:', messages);
        
        // Verificar si hay mensajes y si tienen el formato correcto
        if (messages && messages.length > 0) {
            console.log(' Primer mensaje de ejemplo:', messages[0]);
        } else {
            console.log(' No hay mensajes para mostrar');
        }
    }, [messages]);

    // Función para formatear fecha
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        });
    };

    // Función para formatear hora
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Desplazar automáticamente al último mensaje
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Obtener previsualización de enlaces (deshabilitado para evitar errores 401)
    useEffect(() => {
        const fetchPreviews = async () => {
            const newPreviews = {};
            const urlRegex = /(https?:\/\/[^\s]+)/g;

            for (const msg of messages) {
                const urls = msg.message.match(urlRegex);
                if (urls) {
                    for (const url of urls) {
                        // Solo crear preview básica sin llamar a API externa
                        if (!previews[url]) {
                            try {
                                // Preview básica sin llamar API externa
                                const urlObj = new URL(url);
                                newPreviews[url] = {
                                    title: urlObj.hostname,
                                    description: url,
                                    image: '',
                                    url: url,
                                };
                            } catch (error) {
                                console.error(`Error al procesar URL ${url}:`, error);
                            }
                        }
                    }
                }
            }
            if (Object.keys(newPreviews).length > 0) {
                setPreviews((prev) => ({ ...prev, ...newPreviews }));
            }
        };

        fetchPreviews();
    }, [messages]);

    // Función para detectar el tipo de archivo por URL
    const getFileType = (url) => {
        if (!url) return 'unknown';
        
        const extension = url.split('.').pop().split('?')[0].toLowerCase();
        
        // Imágenes
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
            return 'image';
        }
        // PDFs
        if (extension === 'pdf') {
            return 'pdf';
        }
        // Videos
        if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(extension)) {
            return 'video';
        }
        // Audio
        if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) {
            return 'audio';
        }
        // Documentos de Office
        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
            return 'document';
        }
        // Archivos comprimidos
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
            return 'archive';
        }
        // Texto
        if (['txt', 'csv', 'json', 'xml'].includes(extension)) {
            return 'text';
        }
        
        return 'unknown';
    };

    // Función para obtener el nombre del archivo desde la URL
    const getFileName = (url) => {
        if (!url) return 'archivo';
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const fileName = pathname.split('/').pop();
            return decodeURIComponent(fileName) || 'archivo';
        } catch {
            return url.split('/').pop().split('?')[0] || 'archivo';
        }
    };

    // Función para abrir modal de imagen
    const openImageModal = (url) => {
        setImageModal({ show: true, url });
    };

    // Función para cerrar modal de imagen
    const closeImageModal = () => {
        setImageModal({ show: false, url: '' });
    };

    // Renderizar contenido del mensaje
    const renderMessageContent = (msg) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = msg.message.match(urlRegex);
        const fileType = getFileType(msg.imageUrl);
        const fileName = getFileName(msg.imageUrl);

        return (
            <div className="message-content-wrapper">
                {msg.imageUrl && (
                    <div className="message-file-container">
                        {fileType === 'image' ? (
                            // Renderizar imagen
                            <div className="message-image-container">
                                <img 
                                    src={msg.imageUrl} 
                                    alt="Imagen compartida" 
                                    className="message-image"
                                    onClick={() => openImageModal(msg.imageUrl)}
                                    title="Click para ver en tamaño completo"
                                />
                            </div>
                        ) : fileType === 'pdf' ? (
                            // Renderizar PDF
                            <div className="message-pdf-container">
                                <div className="pdf-preview">
                                    <span className="pdf-icon">📄</span>
                                    <div className="pdf-info">
                                        <span className="pdf-name" title={fileName}>{fileName}</span>
                                        <span className="pdf-type">Documento PDF</span>
                                    </div>
                                </div>
                                <div className="pdf-actions">
                                    <a 
                                        href={msg.imageUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="pdf-button pdf-view"
                                    >
                                        👁️ Ver
                                    </a>
                                    <a 
                                        href={msg.imageUrl} 
                                        download={fileName}
                                        className="pdf-button pdf-download"
                                    >
                                        ⬇️ Descargar
                                    </a>
                                </div>
                            </div>
                        ) : fileType === 'video' ? (
                            // Renderizar video
                            <div className="message-video-container">
                                <video 
                                    controls 
                                    className="message-video"
                                    preload="metadata"
                                >
                                    <source src={msg.imageUrl} />
                                    Tu navegador no soporta videos.
                                </video>
                                <span className="file-name">{fileName}</span>
                            </div>
                        ) : fileType === 'audio' ? (
                            // Verificar si es un mensaje de voz grabado o un archivo de audio subido
                            msg.isVoiceMessage ? (
                                // Mensaje de voz grabado con micrófono - estilo WhatsApp
                                <div className="voice-message-container">
                                    <div className="voice-icon-wrapper">
                                        <span className="voice-icon">🎤</span>
                                    </div>
                                    <VoiceMessagePlayer audioUrl={msg.imageUrl} />
                                </div>
                            ) : (
                                // Archivo de audio subido - estilo clásico
                                <div className="message-audio-container">
                                    <div className="audio-player">
                                        <span className="audio-icon">🎵</span>
                                        <audio controls className="audio-control" preload="metadata">
                                            <source src={msg.imageUrl} type="audio/webm" />
                                            <source src={msg.imageUrl} type="audio/mpeg" />
                                            <source src={msg.imageUrl} type="audio/mp3" />
                                            <source src={msg.imageUrl} type="audio/wav" />
                                            <source src={msg.imageUrl} type="audio/ogg" />
                                            Tu navegador no soporta la reproducción de audio.
                                        </audio>
                                    </div>
                                    <span className="audio-file-name">{fileName}</span>
                                </div>
                            )
                        ) : fileType === 'document' ? (
                            // Renderizar documento de Office
                            <div className="message-document-container">
                                <div className="document-preview">
                                    <span className="document-icon">📝</span>
                                    <div className="document-info">
                                        <span className="document-name" title={fileName}>{fileName}</span>
                                        <span className="document-type">Documento de Office</span>
                                    </div>
                                </div>
                                <a 
                                    href={msg.imageUrl} 
                                    download={fileName}
                                    className="document-button"
                                >
                                    ⬇️ Descargar
                                </a>
                            </div>
                        ) : fileType === 'archive' ? (
                            // Renderizar archivo comprimido
                            <div className="message-archive-container">
                                <div className="archive-preview">
                                    <span className="archive-icon">🗜️</span>
                                    <div className="archive-info">
                                        <span className="archive-name" title={fileName}>{fileName}</span>
                                        <span className="archive-type">Archivo comprimido</span>
                                    </div>
                                </div>
                                <a 
                                    href={msg.imageUrl} 
                                    download={fileName}
                                    className="archive-button"
                                >
                                    ⬇️ Descargar
                                </a>
                            </div>
                        ) : (
                            // Renderizar archivo genérico
                            <div className="message-file-generic">
                                <div className="file-preview">
                                    <span className="file-icon">📎</span>
                                    <div className="file-info">
                                        <span className="file-name" title={fileName}>{fileName}</span>
                                        <span className="file-type">Archivo adjunto</span>
                                    </div>
                                </div>
                                <a 
                                    href={msg.imageUrl} 
                                    download={fileName}
                                    className="file-button"
                                >
                                    ⬇️ Descargar
                                </a>
                            </div>
                        )}
                    </div>
                )}
                {msg.message && (
                    <div className="message-text">
                        {urls ? (
                            <div>
                                <Linkify>{msg.message}</Linkify>
                                {urls.map((url) => (
                                    previews[url] ? (
                                        <div key={url} className="link-preview-container">
                                            {previews[url].image && (
                                                <img
                                                    src={previews[url].image}
                                                    alt="Preview"
                                                    className="link-preview-image"
                                                />
                                            )}
                                            <h3 className="link-preview-title">{previews[url].title}</h3>
                                            <p className="link-preview-description">{previews[url].description}</p>
                                            <a
                                                href={previews[url].url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link-preview-url"
                                            >
                                                Visitar sitio
                                            </a>
                                        </div>
                                    ) : (
                                        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                                            {url}
                                        </a>
                                    )
                                ))}
                            </div>
                        ) : (
                            msg.message
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="message-list">
                {messages.map((msg, index) => (
                    <div key={msg._id} className={`message-item ${msg.username === username ? 'sent' : 'received'}`}>
                        {index === 0 || formatDate(messages[index - 1].timestamp) !== formatDate(msg.timestamp) ? (
                            <div className="message-date">{formatDate(msg.timestamp)}</div>
                        ) : null}
                        <div className="message-username">
                            {msg.replyTo ? (
                                <span>
                                    {msg.username} respondió a {msg.replyTo.username} - "{msg.replyTo.message}"
                                </span>
                            ) : (
                                msg.username
                            )}
                        </div>
                        <div className="message-content">{renderMessageContent(msg)}</div>
                        <div className="message-time">{formatTime(msg.timestamp)}</div>
                        <button onClick={() => onReply(msg._id)} className="reply-button">
                            <FaReply />
                        </button>
                    </div>
                ))}
                <div ref={messageEndRef}></div>
            </div>

            {/* Modal para imagen ampliada */}
            {imageModal.show && (
                <div className="image-modal-overlay" onClick={closeImageModal}>
                    <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="image-modal-close" onClick={closeImageModal}>
                            ✕
                        </button>
                        <img 
                            src={imageModal.url} 
                            alt="Imagen ampliada" 
                            className="image-modal-img"
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default MessageList;
