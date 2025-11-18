const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../../models/User');

describe('Auth Routes Integration Tests', () => {
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
        app.post('/api/auth/register', async (req, res) => {
            try {
                const { username, password } = req.body;
                
                if (!username || username.length < 3) {
                    return res.status(400).json({ message: 'Username must be at least 3 characters' });
                }
                
                if (!password || password.length < 8) {
                    return res.status(400).json({ message: 'Password must be at least 8 characters' });
                }

                const user = new User({ username, password });
                await user.save();

                res.status(201).json({ message: 'User registered successfully' });
            } catch (error) {
                if (error.code === 11000) {
                    return res.status(400).json({ message: 'Username already exists' });
                }
                res.status(500).json({ message: 'Server error' });
            }
        });

        app.post('/api/auth/login', async (req, res) => {
            try {
                const { username, password } = req.body;
                const user = await User.findOne({ username });

                if (!user) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                const isMatch = await user.comparePassword(password);
                if (!isMatch) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                res.status(200).json({ message: 'Login successful' });
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
        await User.deleteMany({});
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const userData = {
                username: 'newuser',
                password: 'Password123!'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('success');
        });

        it('should reject registration with short username', async () => {
            const userData = {
                username: 'ab',
                password: 'Password123!'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });

        it('should reject registration with weak password', async () => {
            const userData = {
                username: 'testuser',
                password: '123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            // First register a user
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'loginuser',
                    password: 'Password123!'
                });

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'loginuser',
                    password: 'Password123!'
                })
                .expect(200);

            expect(response.body).toHaveProperty('message');
        });

        it('should reject login with invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistent',
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });
    });
});
