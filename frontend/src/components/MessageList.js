import React, { useEffect, useRef } from 'react';
import { FaReply } from 'react-icons/fa';
import '../styles/sendMessages.css';

const MessageList = ({ messages, onReply, username }) => {
    const messageEndRef = useRef(null);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                            msg.message
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
