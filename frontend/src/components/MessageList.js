import React, { useEffect, useRef } from 'react';
import '../styles/sendMessages.css';

const MessageList = ({ messages, onReply, username }) => {
    const messageEndRef = useRef(null); // Referencia al final de la lista de mensajes

    // Desplazar hacia el último mensaje
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' }); // Hace el scroll suave
    }, [messages]); // Se ejecuta cada vez que cambia la lista de mensajes

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
                        <strong>{msg.username}: </strong>{msg.message}
                    </div>
                    <button onClick={() => onReply(msg._id)} className="reply-button">Responder</button>
                </div>
            ))}
            {/* Elemento invisible al final para desplazar el scroll */}
            <div ref={messageEndRef}></div>
        </div>
    );
};

export default MessageList;
