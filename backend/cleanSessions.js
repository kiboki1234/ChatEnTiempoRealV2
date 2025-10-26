// Script para limpiar todas las sesiones activas y resolver el problema de IPs
const mongoose = require('mongoose');
require('dotenv').config();

async function cleanSessions() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Conectado a MongoDB');

        const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));
        
        // Eliminar TODAS las sesiones
        const result = await Session.deleteMany({});
        console.log(`✓ ${result.deletedCount} sesiones eliminadas`);

        console.log('✓ Base de datos limpia. Ahora puedes reiniciar el backend.');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('✗ Error:', error);
        process.exit(1);
    }
}

cleanSessions();
