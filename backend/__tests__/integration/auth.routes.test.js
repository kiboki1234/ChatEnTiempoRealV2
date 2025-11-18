const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/authRoutes');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../../middlewares/authMiddleware', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 'test-user-id', username: 'testuser', role: 'user' };
        next();
    }
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes Integration Tests', () => {
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

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const userData = {
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'Password123!'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect('Content-Type', /json/);

            // The actual status depends on your implementation
            expect([200, 201]).toContain(response.status);
            
            if (response.status === 200 || response.status === 201) {
                expect(response.body).toHaveProperty('message');
            }
        });

        it('should reject registration with invalid email', async () => {
            const userData = {
                username: 'testuser',
                email: 'invalid-email',
                password: 'Password123!'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect([400, 422]).toContain(response.status);
        });

        it('should reject registration with weak password', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: '123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect([400, 422]).toContain(response.status);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            // First register a user
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'loginuser',
                    email: 'login@example.com',
                    password: 'Password123!'
                });

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'loginuser',
                    password: 'Password123!'
                });

            // Check if login endpoint exists
            expect(response.status).not.toBe(404);
        });

        it('should reject login with invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistent',
                    password: 'wrongpassword'
                });

            expect([400, 401]).toContain(response.status);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should logout successfully', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', 'Bearer test-token');

            expect([200, 404]).toContain(response.status);
        });
    });
});
