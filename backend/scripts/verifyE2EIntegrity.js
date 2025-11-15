/**
 * Script de Verificación de Integridad E2E
 * 
 * Verifica que todos los mensajes cifrados puedan descifrarse con sus claves correspondientes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const sodium = require('libsodium-wrappers');
const Room = require('../models/Room');
const Message = require('../models/Message');

async function decryptMessage(ciphertext, nonce, key) {
    await sodium.ready;
    
    try {
        const keyBytes = sodium.from_hex(key);
        const plaintext = sodium.crypto_secretbox_open_easy(
            sodium.from_hex(ciphertext),
            sodium.from_hex(nonce),
            keyBytes
        );
        return sodium.to_string(plaintext);
    } catch (error) {
        throw error;
    }
}

async function verifyE2EIntegrity() {
    try {
        console.log('🔐 Verificando integridad de cifrado E2E...\n');
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        await sodium.ready;
        console.log('✅ Libsodium inicializado\n');

        // Obtener todas las salas activas con sus claves
        console.log('📊 Obteniendo salas con cifrado...');
        const rooms = await Room.find({ isActive: true }).select('+encryptionKey');
        console.log(`✅ Encontradas ${rooms.length} salas activas\n`);

        let totalMessages = 0;
        let successfulDecryptions = 0;
        let failedDecryptions = 0;
        let messagesWithoutEncryption = 0;
        let roomsWithoutKey = 0;

        for (const room of rooms) {
            console.log(`\n🏠 Verificando sala: ${room.pin} (${room.name})`);
            
            if (!room.encryptionKey) {
                console.log(`   ⚠️  Sin clave de cifrado`);
                roomsWithoutKey++;
                continue;
            }

            console.log(`   🔑 Clave: ${room.encryptionKey.substring(0, 16)}...`);

            // Obtener mensajes de esta sala
            const messages = await Message.find({ roomPin: room.pin });
            console.log(`   📨 Mensajes en sala: ${messages.length}`);

            for (const msg of messages) {
                totalMessages++;

                // Si no tiene datos cifrados, omitir
                if (!msg.encryptedMessage || !msg.encryptedMessage.ciphertext) {
                    messagesWithoutEncryption++;
                    continue;
                }

                // Intentar descifrar
                try {
                    const decrypted = await decryptMessage(
                        msg.encryptedMessage.ciphertext,
                        msg.encryptedMessage.nonce,
                        room.encryptionKey
                    );
                    successfulDecryptions++;
                } catch (error) {
                    failedDecryptions++;
                    console.log(`   ❌ Fallo al descifrar mensaje ${msg._id}:`);
                    console.log(`      - Username: ${msg.username}`);
                    console.log(`      - Timestamp: ${msg.timestamp}`);
                    console.log(`      - Ciphertext length: ${msg.encryptedMessage.ciphertext?.length || 0}`);
                    console.log(`      - Nonce length: ${msg.encryptedMessage.nonce?.length || 0}`);
                    console.log(`      - Error: ${error.message}`);
                }
            }
        }

        // Resumen
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE VERIFICACIÓN');
        console.log('='.repeat(60));
        console.log(`🏠 Salas verificadas: ${rooms.length}`);
        console.log(`   ⚠️  Salas sin clave: ${roomsWithoutKey}`);
        console.log(`\n📨 Mensajes totales: ${totalMessages}`);
        console.log(`   ✅ Descifrados exitosamente: ${successfulDecryptions}`);
        console.log(`   ❌ Fallos al descifrar: ${failedDecryptions}`);
        console.log(`   ⚠️  Sin cifrado: ${messagesWithoutEncryption}`);
        console.log('='.repeat(60));

        if (failedDecryptions === 0 && roomsWithoutKey === 0) {
            console.log('\n✅ ¡Integridad perfecta! Todos los mensajes cifrados son válidos');
        } else {
            console.log('\n⚠️  Se encontraron problemas de integridad');
            
            if (failedDecryptions > 0) {
                console.log(`\n💡 Recomendación: Ejecuta el script de migración para recifrar mensajes problemáticos`);
            }
            
            if (roomsWithoutKey > 0) {
                console.log(`\n💡 Recomendación: Ejecuta el script de migración para generar claves faltantes`);
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
}

verifyE2EIntegrity();
