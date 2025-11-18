const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Room = require('../../models/Room');

describe('Room Routes Integration Tests', () => {
    let app;

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Create a minimal Express app for testing
        app = express();
        app.use(express.json());

        // Simple test routes
        app.get('/api/rooms', async (req, res) => {
            try {
                const rooms = await Room.find({ isActive: true }).select('-pinHash');
                res.status(200).json(rooms);
            } catch (error) {
                res.status(500).json({ message: 'Server error' });
            }
        });

        app.post('/api/rooms', async (req, res) => {
            try {
                const { name, maxParticipants, type, createdByUsername } = req.body;
                
                if (!name || name.length < 1) {
                    return res.status(400).json({ message: 'Room name is required' });
                }

                const pin = Math.floor(100000 + Math.random() * 900000).toString();
                const room = new Room({
                    name,
                    pin,
                    maxParticipants: maxParticipants || 10,
                    type: type || 'text',
                    createdByUsername: createdByUsername || 'testuser'
                });

                await room.save();
                res.status(201).json({ pin, message: 'Room created successfully' });
            } catch (error) {
                res.status(500).json({ message: 'Server error' });
            }
        });

        app.get('/api/rooms/:pin', async (req, res) => {
            try {
                const room = await Room.findOne({ pin: req.params.pin, isActive: true });
                if (!room) {
                    return res.status(404).json({ message: 'Room not found' });
                }
                res.status(200).json(room);
            } catch (error) {
                res.status(500).json({ message: 'Server error' });
            }
        });
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    afterEach(async () => {
        await Room.deleteMany({});
    });

    describe('GET /api/rooms', () => {
        it('should get all active rooms', async () => {
            const response = await request(app)
                .get('/api/rooms')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('POST /api/rooms', () => {
        it('should create a new room', async () => {
            const roomData = {
                name: 'Test Room',
                maxParticipants: 10,
                type: 'text',
                createdByUsername: 'testuser'
            };

            const response = await request(app)
                .post('/api/rooms')
                .send(roomData)
                .expect(201);

            expect(response.body).toHaveProperty('pin');
            expect(response.body).toHaveProperty('message');
        });

        it('should reject room creation without name', async () => {
            const roomData = {
                maxParticipants: 10
            };

            const response = await request(app)
                .post('/api/rooms')
                .send(roomData)
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('GET /api/rooms/:pin', () => {
        it('should get room by pin', async () => {
            // Create a room first
            const room = await Room.create({
                name: 'Test Room',
                pin: '123456',
                type: 'text',
                createdByUsername: 'testuser'
            });

            const response = await request(app)
                .get(`/api/rooms/${room.pin}`)
                .expect(200);

            expect(response.body).toHaveProperty('name');
            expect(response.body.name).toBe('Test Room');
        });

        it('should return 404 for non-existent room', async () => {
            const response = await request(app)
                .get('/api/rooms/999999')
                .expect(404);

            expect(response.body).toHaveProperty('message');
        });
    });
});
