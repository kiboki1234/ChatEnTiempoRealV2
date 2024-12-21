import React, { useEffect, useRef, useState } from 'react';
import { FaReply } from 'react-icons/fa';
import Linkify from 'react-linkify'; // Convierte texto en enlaces clickeables
import axios from 'axios'; // Para solicitudes HTTP
import '../styles/sendMessages.css';

const MessageList = ({ messages, onReply, username }) => {
    const messageEndRef = useRef(null);
    const [previews, setPreviews] = useState({}); // Almacena las previsualizaciones

    // Desplazar automáticamente al último mensaje
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Obtener previsualización de los enlaces usando OpenGraph.io
    useEffect(() => {
        const fetchPreviews = async () => {
            const newPreviews = {};
            const urlRegex = /(https?:\/\/[^\s]+)/g;

            for (const msg of messages) {
                const urls = msg.message.match(urlRegex);
                if (urls) {
                    for (const url of urls) {
                        if (!previews[url]) { // Si no está en caché
                            try {
                                const response = await axios.get(
                                    `https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=465a9207-8b19-4775-b59c-e7ff8e34124a`
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
            setPreviews(prev => ({ ...prev, ...newPreviews })); // Actualizar estado
        };

        fetchPreviews();
    }, [messages]);

    // Renderizar el contenido del mensaje
    const renderMessageContent = (msg) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = msg.message.match(urlRegex);

        if (urls) {
            return (
                <div>
                    <Linkify>{msg.message}</Linkify> {/* Convierte texto en enlaces */}
                    {urls.map((url, index) => (
                        previews[url] ? (
                            <div key={index} className="link-preview-container">
                                {/* Renderiza la previsualización */}
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
                            <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {url}
                            </a>
                        )
                    ))}
                </div>
            );
        }

        return msg.message; // Devuelve el mensaje si no hay enlaces
    };

    return (
        <div className="message-list">
            {messages.map((msg, index) => (
                <div
                    key={index}
                    className={`message-item ${msg.username === username ? 'sent' : 'received'}`}
                >
                    {msg.replyTo && (
                        <div className="reply-preview">
                            <strong>{msg.replyTo.username}</strong>: "{msg.replyTo.message}"
                        </div>
                    )}
                    <div className="message-content">
                        <strong>{msg.username}: </strong>
                        {msg.sticker ? (
                            <span className="sticker">{msg.sticker}</span>
                        ) : (
                            renderMessageContent(msg) // Renderiza mensaje con previsualización
                        )}
                    </div>
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
