const mongoose = require('mongoose');
const User = require('../../models/User');

describe('User Model', () => {
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
        await User.deleteMany({});
    });

    describe('User Creation', () => {
        it('should create a user successfully', async () => {
            const userData = {
                username: 'testuser',
                password: 'Password123!',
                role: 'user'
            };

            const user = new User(userData);
            const savedUser = await user.save();

            expect(savedUser._id).toBeDefined();
            expect(savedUser.username).toBe(userData.username);
            expect(savedUser.role).toBe('user');
            expect(savedUser.isActive).toBe(true);
        });

        it('should fail to create user without required fields', async () => {
            const user = new User({});

            let error;
            try {
                await user.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.username).toBeDefined();
        });

        it('should not allow duplicate usernames', async () => {
            const userData = {
                username: 'testuser',
                password: 'Password123!'
            };

            await User.create(userData);

            const duplicateUser = new User({
                username: 'testuser',
                password: 'Password456!'
            });

            let error;
            try {
                await duplicateUser.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.code).toBe(11000); // Duplicate key error
        });
    });

    describe('User 2FA', () => {
        it('should enable 2FA successfully', async () => {
            const user = await User.create({
                username: 'testuser',
                password: 'Password123!'
            });

            user.twoFactorSecret = 'test-secret';
            user.twoFactorEnabled = true;
            await user.save();

            const updatedUser = await User.findById(user._id);
            expect(updatedUser.twoFactorEnabled).toBe(true);
            expect(updatedUser.twoFactorSecret).toBe('test-secret');
        });
    });

    describe('User Sessions', () => {
        it('should track last login', async () => {
            const user = await User.create({
                username: 'testuser',
                password: 'Password123!'
            });

            const updatedUser = await User.findById(user._id);
            expect(updatedUser.lastActivity).toBeDefined();
        });
    });
});
