/**
 * Script para sincronizar los contadores de salas activas con la realidad
 * 
 * Este script:
 * 1. Encuentra todas las salas activas en la BD
 * 2. Cuenta cuántas salas tiene cada usuario
 * 3. Actualiza el campo stats.activeRoomsCount de cada usuario
 * 4. Actualiza el array stats.activeRooms con los roomIds correctos
 * 
 * Uso:
 *   node scripts/syncRoomCounts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const User = require('../models/User');

const syncRoomCounts = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        // 1. Obtener todas las salas activas
        console.log('📊 Obteniendo salas activas...');
        const activeRooms = await Room.find({ isActive: true }).select('_id pin name createdBy createdByUsername');
        console.log(`✅ Encontradas ${activeRooms.length} salas activas\n`);

        // 2. Agrupar salas por usuario
        const roomsByUser = {};
        for (const room of activeRooms) {
            const username = room.createdByUsername;
            if (!username) {
                console.log(`⚠️  Sala ${room.pin} (${room.name}) no tiene createdByUsername`);
                continue;
            }
            
            if (!roomsByUser[username]) {
                roomsByUser[username] = [];
            }
            
            roomsByUser[username].push({
                roomId: room._id,
                pin: room.pin,
                name: room.name,
                createdAt: room._id.getTimestamp()
            });
        }

        console.log(`👥 Usuarios con salas activas: ${Object.keys(roomsByUser).length}\n`);

        // 3. Actualizar cada usuario
        let usersUpdated = 0;
        let errors = 0;

        for (const [username, rooms] of Object.entries(roomsByUser)) {
            try {
                const user = await User.findOne({ username });
                
                if (!user) {
                    console.log(`⚠️  Usuario ${username} no encontrado en la BD`);
                    errors++;
                    continue;
                }

                // Actualizar stats
                const oldCount = user.stats?.activeRoomsCount || 0;
                const newCount = rooms.length;

                user.stats = user.stats || {};
                user.stats.activeRoomsCount = newCount;
                user.stats.activeRooms = rooms.map(r => ({
                    roomId: r.roomId,
                    pin: r.pin,
                    createdAt: r.createdAt
                }));

                await user.save();

                console.log(`✅ ${username}: ${oldCount} → ${newCount} salas`);
                rooms.forEach(r => {
                    console.log(`   📌 ${r.pin} (${r.name})`);
                });
                console.log('');

                usersUpdated++;
            } catch (error) {
                console.error(`❌ Error actualizando usuario ${username}:`, error.message);
                errors++;
            }
        }

        // 4. Limpiar usuarios sin salas activas
        console.log('\n🧹 Limpiando usuarios sin salas activas...');
        const usersWithoutRooms = await User.find({
            'stats.activeRoomsCount': { $gt: 0 }
        });

        let cleanedUsers = 0;
        for (const user of usersWithoutRooms) {
            const hasRooms = roomsByUser[user.username];
            if (!hasRooms) {
                user.stats.activeRoomsCount = 0;
                user.stats.activeRooms = [];
                await user.save();
                console.log(`✅ Limpiado ${user.username} (tenía contador pero sin salas)`);
                cleanedUsers++;
            }
        }

        // 5. Resumen
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE SINCRONIZACIÓN');
        console.log('='.repeat(50));
        console.log(`✅ Usuarios actualizados: ${usersUpdated}`);
        console.log(`🧹 Usuarios limpiados: ${cleanedUsers}`);
        console.log(`❌ Errores: ${errors}`);
        console.log(`📦 Total salas activas: ${activeRooms.length}`);
        console.log('='.repeat(50));

        // 6. Mostrar usuarios que exceden el límite
        console.log('\n⚠️  USUARIOS QUE EXCEDEN EL LÍMITE (3 salas):');
        for (const [username, rooms] of Object.entries(roomsByUser)) {
            if (rooms.length > 3) {
                console.log(`❗ ${username}: ${rooms.length} salas`);
                rooms.forEach(r => {
                    console.log(`   📌 ${r.pin} (${r.name})`);
                });
            }
        }

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
console.log('🚀 Iniciando sincronización de contadores de salas...\n');
syncRoomCounts();
