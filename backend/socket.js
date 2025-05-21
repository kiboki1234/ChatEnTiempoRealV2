const { Server } = require('socket.io');
const Room = require('./models/Room');
const { createMessage } = require('./controllers/chatController');
const roomController = require('./controllers/roomController');

const socketRooms = new Map();

module.exports = (server) => {
    const io = new Server(server, {
        cors: { origin: '*' }
    });

    const emitRoomUpdate = (room) => {
        io.emit('roomUpdated', {
            pin: room.pin,
            participantCount: room.participants.length,
            maxParticipants: room.maxParticipants
        });
    };

    const emitUserActivity = (type, username, room, extra = {}) => {
        io.emit('userActivity', {
            type,
            username,
            room,
            timestamp: new Date(),
            ...extra
        });
    };

    const joinRoom = async (socket, pin, username) => {
        if (pin === 'general') {
            socket.join('general');
            return {
                pin: 'general',
                name: 'Chat General',
                participants: [],
                maxParticipants: Infinity
            };
        }

        const room = await Room.findOne({ pin });
        if (!room) throw new Error('Sala no encontrada');

        const alreadyInRoom = room.participants.some(p => p.username === username);
        if (room.participants.length >= room.maxParticipants && !alreadyInRoom)
            throw new Error('La sala está llena');

        await Room.updateOne(
            { pin },
            { $pull: { participants: { username } } }
        );

        const updatedRoom = await Room.findOneAndUpdate(
            { pin },
            { $addToSet: { participants: { socketId: socket.id, username } } },
            { new: true }
        );

        socketRooms.set(socket.id, pin);
        return updatedRoom;
    };

    const leaveRoom = async (socket) => {
        const pin = socket.roomPin;
        const username = socket.username;
        if (!pin) return;

        socket.leave(pin);

        if (pin === 'general') {
            emitUserActivity('left', username, 'general');
            return;
        }

        const updatedRoom = await Room.findOneAndUpdate(
            { pin },
            { $pull: { participants: { socketId: socket.id } } },
            { new: true }
        );

        if (updatedRoom) {
            io.to(pin).emit('userLeft', {
                socketId: socket.id,
                username,
                participants: updatedRoom.participants,
                timestamp: new Date()
            });
            emitRoomUpdate(updatedRoom);
        }

        socketRooms.delete(socket.id);
    };

    io.on('connection', (socket) => {
        console.log('Conectado:', socket.id);

        socket.on('joinRoom', async ({ pin, username }) => {
            try {
                const previousRoom = socket.roomPin;

                if (previousRoom && previousRoom !== pin) {
                    await leaveRoom(socket);
                }

                const room = await joinRoom(socket, pin, username);
                socket.join(pin);
                socket.roomPin = pin;
                socket.username = username;

                socket.emit('roomJoined', room);

                if (pin !== 'general') {
                    io.to(pin).emit('userJoined', {
                        socketId: socket.id,
                        username,
                        participants: room.participants,
                        timestamp: new Date()
                    });
                    emitRoomUpdate(room);
                } else {
                    io.to('general').emit('userJoined', {
                        socketId: socket.id,
                        username,
                        timestamp: new Date()
                    });
                }

                emitUserActivity('roomChange', username, pin, { fromRoom: previousRoom || 'none' });

            } catch (error) {
                console.error('Error en joinRoom:', error);
                socket.emit('roomError', { message: error.message });
            }
        });

        socket.on('leaveRoom', async () => {
            try {
                if (socket.roomPin) {
                    await leaveRoom(socket);
                    socket.emit('roomLeft');
                }
            } catch (error) {
                socket.emit('roomError', { message: error.message });
            }
        });

        socket.on('sendMessage', async (data) => {
            const roomPin = data.roomPin || socketRooms.get(socket.id) || 'general';
            const message = await createMessage({ ...data, roomPin });
            io.to(roomPin).emit('receiveMessage', message);
        });

        socket.on('createRoom', async ({ name, maxParticipants }) => {
            try {
                const room = await roomController.createRoom(name, maxParticipants);
                io.emit('roomCreated', room);
                socket.emit('roomCreated', { ...room.toObject(), autoJoin: true });
            } catch (error) {
                socket.emit('roomError', { message: 'Error al crear la sala' });
            }
        });

        socket.on('disconnect', async () => {
            const pin = socket.roomPin || socketRooms.get(socket.id);
            const username = socket.username || 'Desconocido';

            if (!pin) return;

            if (pin === 'general') {
                io.to('general').emit('userDisconnected', {
                    socketId: socket.id,
                    username,
                    timestamp: new Date()
                });
            } else {
                const updatedRoom = await Room.findOneAndUpdate(
                    { pin },
                    { $pull: { participants: { socketId: socket.id } } },
                    { new: true }
                );

                if (updatedRoom) {
                    io.to(pin).emit('userLeft', {
                        socketId: socket.id,
                        username,
                        participants: updatedRoom.participants,
                        timestamp: new Date()
                    });
                    emitRoomUpdate(updatedRoom);
                }
            }

            emitUserActivity('disconnected', username, pin);
            socketRooms.delete(socket.id);
        });
    });
};
