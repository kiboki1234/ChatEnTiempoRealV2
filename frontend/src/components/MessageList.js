import React, { useEffect, useRef, useState } from 'react';
import { FaReply } from 'react-icons/fa';
import Linkify from 'react-linkify'; // Convierte texto en enlaces clickeables
import axios from 'axios'; // Para solicitudes HTTP
import '../styles/sendMessages.css';

const MessageList = ({ messages = [], onReply, username }) => {
    const messageEndRef = useRef(null);
    const [previews, setPreviews] = useState({}); // Almacena las previsualizaciones

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

    // Obtener previsualización de enlaces
    useEffect(() => {
        const fetchPreviews = async () => {
            const newPreviews = {};
            const urlRegex = /(https?:\/\/[^\s]+)/g;

            for (const msg of messages) {
                const urls = msg.message.match(urlRegex);
                if (urls) {
                    for (const url of urls) {
                        if (!previews[url]) {
                            try {
                                const response = await axios.get(
                                    `https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=YOUR_APP_ID`
                                );

                                const ogData = response.data.hybridGraph;
                                newPreviews[url] = {
                                    title: ogData.title || 'Sin título',
                                    description: ogData.description || 'Sin descripción',
                                    image: ogData.image || '',
                                    url: url,
                                };
                            } catch (error) {
                                console.error(`Error al obtener previsualización para ${url}:`, error);
                            }
                        }
                    }
                }
            }
            setPreviews((prev) => ({ ...prev, ...newPreviews }));
        };

        fetchPreviews();
    }, [messages]);

    // Renderizar contenido del mensaje
    const renderMessageContent = (msg) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = msg.message.match(urlRegex);

        return (
            <div>
                {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Imagen" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                )}
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
        );
    };

    return (
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
    );
};

export default MessageList;
