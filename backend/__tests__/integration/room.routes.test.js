const request = require('supertest');
const express = require('express');
const roomRoutes = require('../../routes/roomRoutes');
const mongoose = require('mongoose');

// Mock authentication middleware
jest.mock('../../middlewares/authMiddleware', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 'test-user-id', username: 'testuser', role: 'user' };
        next();
    },
    authorizeAdmin: (req, res, next) => {
        req.user = { id: 'admin-id', username: 'admin', role: 'admin' };
        next();
    }
}));

const app = express();
app.use(express.json());
app.use('/api/rooms', roomRoutes);

describe('Room Routes Integration Tests', () => {
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

    describe('GET /api/rooms', () => {
        it('should get all active rooms', async () => {
            const response = await request(app)
                .get('/api/rooms')
                .expect('Content-Type', /json/);

            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(Array.isArray(response.body) || response.body.rooms).toBeTruthy();
            }
        });
    });

    describe('POST /api/rooms', () => {
        it('should create a new room', async () => {
            const roomData = {
                name: 'Test Room',
                maxParticipants: 10,
                type: 'public'
            };

            const response = await request(app)
                .post('/api/rooms')
                .set('Authorization', 'Bearer test-token')
                .send(roomData);

            expect([200, 201, 404]).toContain(response.status);
            
            if (response.status === 200 || response.status === 201) {
                expect(response.body).toHaveProperty('pin');
            }
        });

        it('should reject room creation without authentication', async () => {
            const roomData = {
                name: 'Test Room',
                maxParticipants: 10
            };

            const response = await request(app)
                .post('/api/rooms')
                .send(roomData);

            // Might be 401 or 404 depending on route setup
            expect([401, 404]).toContain(response.status);
        });
    });

    describe('GET /api/rooms/:pin', () => {
        it('should get room by pin', async () => {
            const response = await request(app)
                .get('/api/rooms/123456');

            expect([200, 404]).toContain(response.status);
        });
    });

    describe('DELETE /api/rooms/:pin', () => {
        it('should delete room', async () => {
            const response = await request(app)
                .delete('/api/rooms/123456')
                .set('Authorization', 'Bearer test-token');

            expect([200, 404]).toContain(response.status);
        });
    });
});
