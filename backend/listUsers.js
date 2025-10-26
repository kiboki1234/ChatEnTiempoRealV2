/**
 * Script para listar todos los usuarios del sistema
 * Uso: node listUsers.js
 */

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kiboki:kiboki@cluster0.gdvvk58.mongodb.net/chatonline';

async function listUsers() {
    try {
        // Conectar a MongoDB
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Obtener todos los usuarios
        const users = await User.find({}).sort({ createdAt: -1 });

        if (users.length === 0) {
            console.log('⚠️  No hay usuarios registrados en el sistema');
            return;
        }

        console.log(`📊 Total de usuarios: ${users.length}\n`);
        console.log('═'.repeat(80));

        // Estadísticas
        const admins = users.filter(u => u.role === 'admin').length;
        const regularUsers = users.filter(u => u.role === 'user').length;
        const with2FA = users.filter(u => u.twoFactorEnabled).length;

        console.log(`👥 Usuarios regulares: ${regularUsers}`);
        console.log(`⭐ Administradores: ${admins}`);
        console.log(`🔐 Con 2FA activado: ${with2FA}`);
        console.log('═'.repeat(80));
        console.log('\n');

        // Listar cada usuario
        users.forEach((user, index) => {
            const roleEmoji = user.role === 'admin' ? '⭐' : '👤';
            const twoFAStatus = user.twoFactorEnabled ? '🔐' : '🔓';
            
            console.log(`${index + 1}. ${roleEmoji} ${user.username}`);
            console.log(`   Role: ${user.role.toUpperCase()}`);
            console.log(`   2FA: ${user.twoFactorEnabled ? 'Activado' : 'Desactivado'} ${twoFAStatus}`);
            console.log(`   ID: ${user._id}`);
            console.log(`   Creado: ${user.createdAt.toLocaleString()}`);
            console.log('─'.repeat(80));
        });

        console.log('\n📝 Para crear un administrador:');
        console.log('   node createAdmin.js <username> <password>');
        console.log('\n📝 Para cambiar un usuario existente a admin:');
        console.log('   node createAdmin.js <username_existente> <cualquier_password>');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Desconectado de MongoDB');
        process.exit(0);
    }
}

// Ejecutar script
listUsers();
