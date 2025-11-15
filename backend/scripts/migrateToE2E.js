/**
 * Script de Migración a Cifrado E2E
 * 
 * Este script:
 * 1. Genera claves de cifrado para todas las salas existentes sin clave
 * 2. Cifra todos los mensajes antiguos usando las claves generadas
 * 3. Actualiza la base de datos con los mensajes cifrados
 * 
 * ⚠️ IMPORTANTE: Este script debe ejecutarse UNA SOLA VEZ
 * 
 * Uso:
 *   node scripts/migrateToE2E.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const sodium = require('libsodium-wrappers');
const Room = require('../models/Room');
const Message = require('../models/Message');

// Función para cifrar un mensaje usando libsodium
async function encryptMessage(message, key) {
    await sodium.ready;
    
    // Convertir clave hex a Uint8Array
    const keyBytes = sodium.from_hex(key);
    
    // Generar nonce aleatorio
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    
    // Cifrar
    const ciphertext = sodium.crypto_secretbox_easy(
        sodium.from_string(message),
        nonce,
        keyBytes
    );

    return {
        ciphertext: sodium.to_hex(ciphertext),
        nonce: sodium.to_hex(nonce)
    };
}

async function migrateToE2E() {
    try {
        console.log('🔐 Iniciando migración a cifrado E2E...\n');
        
        // Conectar a MongoDB
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Inicializar libsodium
        await sodium.ready;
        console.log('✅ Libsodium inicializado\n');

        // 1. Encontrar salas sin clave de cifrado
        console.log('📊 Buscando salas sin cifrado...');
        const roomsWithoutKey = await Room.find({
            $or: [
                { encryptionKey: { $exists: false } },
                { encryptionKey: null },
                { encryptionKey: '' }
            ]
        });
        
        console.log(`✅ Encontradas ${roomsWithoutKey.length} salas sin cifrado\n`);

        // 2. Generar claves para salas sin clave
        console.log('🔑 Generando claves de cifrado para salas...');
        let roomsUpdated = 0;
        const roomKeys = new Map();

        for (const room of roomsWithoutKey) {
            const encryptionKey = crypto.randomBytes(32).toString('hex');
            room.encryptionKey = encryptionKey;
            await room.save();
            
            roomKeys.set(room.pin, encryptionKey);
            console.log(`  ✅ Sala ${room.pin} (${room.name}): Clave generada`);
            roomsUpdated++;
        }

        console.log(`\n✅ ${roomsUpdated} salas actualizadas con claves de cifrado\n`);

        // 3. Encontrar mensajes sin cifrar
        console.log('📊 Buscando mensajes sin cifrar...');
        const unencryptedMessages = await Message.find({
            $and: [
                { message: { $ne: null, $ne: '', $ne: '[Cifrado E2E]' } }, // Solo mensajes con texto real
                {
                    $or: [
                        { encryptedMessage: { $exists: false } },
                        { encryptedMessage: null },
                        { 'encryptedMessage.ciphertext': { $exists: false } },
                        { 'encryptedMessage.ciphertext': null },
                        { 'encryptedMessage.ciphertext': '' }
                    ]
                }
            ]
        });

        console.log(`✅ Encontrados ${unencryptedMessages.length} mensajes sin cifrar\n`);

        // 4. Cifrar mensajes
        console.log('🔐 Cifrando mensajes...');
        let messagesEncrypted = 0;
        let messagesSkipped = 0;
        let errors = 0;

        for (const msg of unencryptedMessages) {
            try {
                // Obtener la clave de la sala
                const room = await Room.findOne({ pin: msg.roomPin }).select('+encryptionKey');
                
                if (!room || !room.encryptionKey) {
                    console.log(`  ⚠️  Mensaje ${msg._id}: Sala ${msg.roomPin} sin clave, omitiendo`);
                    messagesSkipped++;
                    continue;
                }

                // Solo cifrar si hay mensaje de texto
                if (!msg.message || msg.message.trim() === '') {
                    messagesSkipped++;
                    continue;
                }

                // Cifrar el mensaje
                const encrypted = await encryptMessage(msg.message, room.encryptionKey);
                
                // Actualizar mensaje
                msg.encryptedMessage = encrypted;
                msg.message = '[Cifrado E2E]'; // Placeholder
                await msg.save();

                messagesEncrypted++;
                
                if (messagesEncrypted % 100 === 0) {
                    console.log(`  📦 Progreso: ${messagesEncrypted} mensajes cifrados...`);
                }

            } catch (error) {
                console.error(`  ❌ Error cifrando mensaje ${msg._id}:`, error.message);
                errors++;
            }
        }

        // 5. Resumen
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE MIGRACIÓN');
        console.log('='.repeat(60));
        console.log(`✅ Salas actualizadas con claves: ${roomsUpdated}`);
        console.log(`🔐 Mensajes cifrados: ${messagesEncrypted}`);
        console.log(`⚠️  Mensajes omitidos: ${messagesSkipped}`);
        console.log(`❌ Errores: ${errors}`);
        console.log('='.repeat(60));

        // 6. Verificar migración
        console.log('\n🔍 Verificando migración...');
        
        const totalRooms = await Room.countDocuments();
        const roomsWithKeys = await Room.countDocuments({
            encryptionKey: { $exists: true, $ne: null, $ne: '' }
        });
        
        const totalMessages = await Message.countDocuments({ message: { $ne: null, $ne: '' } });
        const encryptedMsgs = await Message.countDocuments({
            'encryptedMessage.ciphertext': { $exists: true }
        });

        console.log(`\n📊 Estado final:`);
        console.log(`   Salas totales: ${totalRooms}`);
        console.log(`   Salas con cifrado: ${roomsWithKeys} (${((roomsWithKeys/totalRooms)*100).toFixed(1)}%)`);
        console.log(`   Mensajes totales: ${totalMessages}`);
        console.log(`   Mensajes cifrados: ${encryptedMsgs} (${((encryptedMsgs/totalMessages)*100).toFixed(1)}%)`);

        if (roomsWithKeys === totalRooms && encryptedMsgs === totalMessages) {
            console.log('\n✅ ¡Migración completada exitosamente!');
            console.log('🔐 Todos los mensajes y salas ahora tienen cifrado E2E\n');
        } else {
            console.log('\n⚠️  Migración completada con advertencias');
            console.log('   Algunas salas o mensajes no pudieron ser migrados\n');
        }

    } catch (error) {
        console.error('❌ Error fatal durante la migración:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Conexión cerrada');
        process.exit(0);
    }
}

// Preguntar confirmación antes de ejecutar
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n' + '='.repeat(60));
console.log('⚠️  ADVERTENCIA: MIGRACIÓN A CIFRADO E2E');
console.log('='.repeat(60));
console.log('\nEste script va a:');
console.log('1. Generar claves de cifrado para todas las salas sin clave');
console.log('2. Cifrar TODOS los mensajes antiguos en la base de datos');
console.log('3. Actualizar mensajes con datos cifrados');
console.log('\n⚠️  Esta operación es IRREVERSIBLE');
console.log('⚠️  Se recomienda hacer un backup de la BD antes de continuar');
console.log('\n' + '='.repeat(60) + '\n');

rl.question('¿Deseas continuar? (escribe "SI" para confirmar): ', (answer) => {
    rl.close();
    
    if (answer.trim().toUpperCase() === 'SI') {
        console.log('\n🚀 Iniciando migración...\n');
        migrateToE2E();
    } else {
        console.log('\n❌ Migración cancelada por el usuario');
        process.exit(0);
    }
});
