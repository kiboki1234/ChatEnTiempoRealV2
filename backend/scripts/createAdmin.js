const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const createDefaultAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: 'admin' });

        if (existingAdmin) {
            console.log('Default admin already exists');
            process.exit(0);
        }

        // Create default admin
        const admin = new Admin({
            username: 'admin',
            email: 'admin@chatapp.com',
            password: '12345678' // Change this password immediately after first login
        });

        await admin.save();

        console.log('✓ Default admin created successfully');
        console.log('  Username: admin');
        console.log('  Password: Admin@123456');
        console.log('  Email: admin@chatapp.com');
        console.log('  ');
        console.log('  ⚠️  IMPORTANT: Change the password immediately after first login!');

        process.exit(0);
    } catch (error) {
        console.error('Error creating default admin:', error);
        process.exit(1);
    }
};

createDefaultAdmin();
