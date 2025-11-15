/**
 * Script para verificar integridad de salas
 * 
 * Verifica:
 * 1. Salas con nombres duplicados
 * 2. Salas con PINs duplicados
 * 3. Salas sin creador
 * 4. Salas activas de usuarios inexistentes
 * 
 * Uso:
 *   node scripts/verifyRoomIntegrity.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const User = require('../models/User');

const verifyRoomIntegrity = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        // 1. Obtener todas las salas activas
        console.log('📊 Obteniendo salas activas...');
        const activeRooms = await Room.find({ isActive: true });
        console.log(`✅ Encontradas ${activeRooms.length} salas activas\n`);

        // 2. Verificar nombres duplicados
        console.log('🔍 Verificando nombres duplicados...');
        const nameGroups = {};
        for (const room of activeRooms) {
            if (!nameGroups[room.name]) {
                nameGroups[room.name] = [];
            }
            nameGroups[room.name].push({
                _id: room._id,
                pin: room.pin,
                creator: room.createdByUsername,
                createdAt: room.createdAt
            });
        }

        const duplicateNames = Object.entries(nameGroups).filter(([_, rooms]) => rooms.length > 1);
        if (duplicateNames.length > 0) {
            console.log(`⚠️  Encontrados ${duplicateNames.length} nombres duplicados:`);
            for (const [name, rooms] of duplicateNames) {
                console.log(`\n📛 "${name}" (${rooms.length} salas):`);
                rooms.forEach(r => {
                    console.log(`   📌 PIN: ${r.pin} | Creador: ${r.creator} | Creada: ${r.createdAt.toLocaleString()}`);
                });
            }
        } else {
            console.log('✅ No hay nombres duplicados\n');
        }

        // 3. Verificar PINs duplicados (esto NO debería pasar nunca)
        console.log('🔍 Verificando PINs duplicados...');
        const pinGroups = {};
        for (const room of activeRooms) {
            if (!pinGroups[room.pin]) {
                pinGroups[room.pin] = [];
            }
            pinGroups[room.pin].push({
                _id: room._id,
                name: room.name,
                creator: room.createdByUsername
            });
        }

        const duplicatePins = Object.entries(pinGroups).filter(([_, rooms]) => rooms.length > 1);
        if (duplicatePins.length > 0) {
            console.log(`❌ ¡ERROR CRÍTICO! Encontrados ${duplicatePins.length} PINs duplicados:`);
            for (const [pin, rooms] of duplicatePins) {
                console.log(`\n🚨 PIN: ${pin} (${rooms.length} salas):`);
                rooms.forEach(r => {
                    console.log(`   📛 ${r.name} | Creador: ${r.creator}`);
                });
            }
        } else {
            console.log('✅ No hay PINs duplicados\n');
        }

        // 4. Verificar salas sin creador
        console.log('🔍 Verificando salas sin creador...');
        const roomsWithoutCreator = activeRooms.filter(r => !r.createdByUsername);
        if (roomsWithoutCreator.length > 0) {
            console.log(`⚠️  Encontradas ${roomsWithoutCreator.length} salas sin creador:`);
            roomsWithoutCreator.forEach(r => {
                console.log(`   📌 ${r.pin} (${r.name})`);
            });
        } else {
            console.log('✅ Todas las salas tienen creador\n');
        }

        // 5. Verificar si los creadores existen en la BD
        console.log('🔍 Verificando existencia de creadores...');
        const creators = [...new Set(activeRooms.map(r => r.createdByUsername).filter(Boolean))];
        const missingCreators = [];
        
        for (const creator of creators) {
            const user = await User.findOne({ username: creator });
            if (!user) {
                missingCreators.push(creator);
                const rooms = activeRooms.filter(r => r.createdByUsername === creator);
                console.log(`⚠️  Usuario "${creator}" no existe pero tiene ${rooms.length} salas:`);
                rooms.forEach(r => {
                    console.log(`   📌 ${r.pin} (${r.name})`);
                });
            }
        }

        if (missingCreators.length === 0) {
            console.log('✅ Todos los creadores existen\n');
        }

        // 6. Resumen
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE INTEGRIDAD');
        console.log('='.repeat(50));
        console.log(`📦 Total salas activas: ${activeRooms.length}`);
        console.log(`👥 Creadores únicos: ${creators.length}`);
        console.log(`⚠️  Nombres duplicados: ${duplicateNames.length}`);
        console.log(`❌ PINs duplicados: ${duplicatePins.length}`);
        console.log(`⚠️  Salas sin creador: ${roomsWithoutCreator.length}`);
        console.log(`⚠️  Creadores inexistentes: ${missingCreators.length}`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Conexión cerrada');
        process.exit(0);
    }
};

// Ejecutar script
console.log('🚀 Verificando integridad de salas...\n');
verifyRoomIntegrity();
