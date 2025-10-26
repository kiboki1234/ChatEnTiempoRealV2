/**
 * Script para crear usuarios administradores
 * Uso: node createAdmin.js <username> <password>
 * Ejemplo: node createAdmin.js admin admin123
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kiboki:kiboki@cluster0.gdvvk58.mongodb.net/chatonline';

async function createAdmin() {
    try {
        // Obtener argumentos de la línea de comandos
        const username = process.argv[2];
        const password = process.argv[3];

        if (!username || !password) {
            console.error('❌ Error: Debes proporcionar username y password');
            console.log('📝 Uso: node createAdmin.js <username> <password>');
            console.log('📝 Ejemplo: node createAdmin.js admin admin123');
            process.exit(1);
        }

        if (username.length < 3 || username.length > 30) {
            console.error('❌ Error: El username debe tener entre 3 y 30 caracteres');
            process.exit(1);
        }

        if (password.length < 6) {
            console.error('❌ Error: La contraseña debe tener al menos 6 caracteres');
            process.exit(1);
        }

        // Conectar a MongoDB
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log('⚠️  El usuario ya existe');
            console.log(`📊 Información actual:`);
            console.log(`   - Username: ${existingUser.username}`);
            console.log(`   - Role: ${existingUser.role}`);
            console.log(`   - 2FA: ${existingUser.twoFactorEnabled ? 'Activado' : 'Desactivado'}`);
            console.log(`   - Creado: ${existingUser.createdAt}`);

            // Preguntar si desea actualizar a admin
            if (existingUser.role === 'admin') {
                console.log('✅ Este usuario ya es administrador');
            } else {
                console.log('\n🔄 Actualizando a rol de administrador...');
                existingUser.role = 'admin';
                await existingUser.save();
                console.log('✅ Usuario actualizado a administrador exitosamente');
            }
        } else {
            // Crear nuevo usuario administrador
            console.log('👤 Creando nuevo usuario administrador...');
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const newAdmin = new User({
                username,
                password: hashedPassword,
                role: 'admin'
            });

            await newAdmin.save();
            
            console.log('✅ Usuario administrador creado exitosamente!\n');
            console.log('📊 Información del usuario:');
            console.log(`   - Username: ${newAdmin.username}`);
            console.log(`   - Role: ${newAdmin.role}`);
            console.log(`   - ID: ${newAdmin._id}`);
            console.log(`   - Creado: ${newAdmin.createdAt}`);
        }

        console.log('\n📝 Próximos pasos:');
        console.log('   1. Inicia sesión con este usuario en la aplicación');
        console.log('   2. Ve a "⚙️ Configuración" en la esquina superior derecha');
        console.log('   3. Configura 2FA en la pestaña "Seguridad" (opcional pero recomendado)');
        console.log('   4. Como admin, tienes acceso ilimitado a crear salas');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Desconectado de MongoDB');
        process.exit(0);
    }
}

// Ejecutar script
createAdmin();
