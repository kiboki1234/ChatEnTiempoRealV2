import React from 'react';
import { FaUser } from 'react-icons/fa';

const RoomParticipants = ({ participants, currentRoom }) => {
    if (!participants || participants.length === 0 || currentRoom === 'general') {
        return null;
    }

    return (
        <div className="room-participants-list">
            <h4>Participantes en la sala ({participants.length})</h4>
            <ul>
                {participants.map((participant) => (
                    <li key={participant.username || participant.socketId || participant.id} className="participant-item">
                        <FaUser className="participant-icon" />
                        <span className="participant-name">{participant.username}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RoomParticipants;