require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function promoteUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB\n');

        // Get username
        const username = await question('Ingresa el nombre de usuario a promover: ');

        if (!username || username.trim().length < 3) {
            console.error('✗ El nombre de usuario debe tener al menos 3 caracteres');
            process.exit(1);
        }

        // Find user
        const user = await User.findOne({ username: username.trim() });

        if (!user) {
            console.error(`✗ Usuario "${username}" no encontrado`);
            console.log('\n💡 El usuario debe haber creado al menos una sala para existir en el sistema');
            process.exit(1);
        }

        // Check if already admin
        if (user.role === 'admin') {
            console.log(`ℹ️  El usuario "${username}" ya es administrador`);
            process.exit(0);
        }

        // Confirm promotion
        const confirm = await question(`\n¿Estás seguro de promover a "${username}" a administrador? (s/n): `);

        if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
            console.log('Operación cancelada');
            process.exit(0);
        }

        // Promote to admin
        user.role = 'admin';
        await user.save();

        console.log('\n✓ Usuario promovido exitosamente');
        console.log(`  Username: ${user.username}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Salas activas: ${user.stats.activeRoomsCount}`);
        console.log(`  Total de salas creadas: ${user.stats.totalRoomsCreated}`);
        console.log(`\n✨ ${username} ahora tiene privilegios ilimitados para crear salas`);

        process.exit(0);
    } catch (error) {
        console.error('✗ Error promoviendo usuario:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

promoteUser();
