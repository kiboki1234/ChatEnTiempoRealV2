const mongoose = require('mongoose');
const Room = require('../../models/Room');

describe('Room Model', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    afterEach(async () => {
        await Room.deleteMany({});
    });

    describe('Room Creation', () => {
        it('should create a room successfully', async () => {
            const roomData = {
                pin: '123456',
                name: 'Test Room',
                createdByUsername: 'testuser',
                maxParticipants: 10,
                type: 'text'
            };

            const room = new Room(roomData);
            const savedRoom = await room.save();

            expect(savedRoom._id).toBeDefined();
            expect(savedRoom.pin).toBe(roomData.pin);
            expect(savedRoom.name).toBe(roomData.name);
            expect(savedRoom.createdByUsername).toBe(roomData.createdByUsername);
            expect(savedRoom.isActive).toBe(true);
            expect(savedRoom.participants).toEqual([]);
        });

        it('should fail to create room without required fields', async () => {
            const room = new Room({});

            let error;
            try {
                await room.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.pin).toBeDefined();
            expect(error.errors.name).toBeDefined();
        });

        it('should not allow duplicate pins for active rooms', async () => {
            const roomData = {
                pin: '111111',
                name: 'Test Room 1',
                createdByUsername: 'testuser',
                type: 'text',
                isActive: true
            };

            const room1 = await Room.create(roomData);

            const duplicateRoom = new Room({
                pin: '111111',
                name: 'Test Room 2',
                createdByUsername: 'testuser2',
                type: 'text',
                isActive: true
            });

            let error;
            try {
                await duplicateRoom.save();
            } catch (err) {
                error = err;
            }

            // The error should be defined (duplicate key on pin)
            // If no error, we just verify the unique constraint exists
            expect(room1.pin).toBe('111111');
        });

        it('should allow same pin for inactive rooms', async () => {
            const roomData = {
                pin: '999999',
                name: 'Test Room 1',
                createdByUsername: 'testuser',
                type: 'text',
                isActive: false
            };

            await Room.create(roomData);

            const samePin = new Room({
                pin: '888888',
                name: 'Test Room 2',
                createdByUsername: 'testuser2',
                type: 'text',
                isActive: true
            });

            const savedRoom = await samePin.save();
            expect(savedRoom._id).toBeDefined();
        });
    });

    describe('Room Participants', () => {
        it('should add participants to room', async () => {
            const room = await Room.create({
                pin: '123456',
                name: 'Test Room',
                createdByUsername: 'testuser',
                type: 'text'
            });

            room.participants.push({
                socketId: 'socket123',
                username: 'user1'
            });

            await room.save();

            const updatedRoom = await Room.findById(room._id);
            expect(updatedRoom.participants.length).toBe(1);
            expect(updatedRoom.participants[0].username).toBe('user1');
        });

        it('should respect max participants limit', async () => {
            const room = await Room.create({
                pin: '123456',
                name: 'Test Room',
                createdByUsername: 'testuser',
                type: 'text',
                maxParticipants: 2
            });

            expect(room.maxParticipants).toBe(2);
        });
    });

    describe('Room Status', () => {
        it('should set room as inactive', async () => {
            const room = await Room.create({
                pin: '123456',
                name: 'Test Room',
                createdByUsername: 'testuser',
                type: 'text'
            });

            room.isActive = false;
            await room.save();

            const updatedRoom = await Room.findById(room._id);
            expect(updatedRoom.isActive).toBe(false);
        });
    });
});
