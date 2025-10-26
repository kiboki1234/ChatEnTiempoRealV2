/**
 * Script para migrar usuarios existentes y agregar campos de 2FA
 * Ejecutar: node scripts/migrate2FAFields.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const migrate = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado a MongoDB');

        console.log('\n🔄 Buscando usuarios sin campos 2FA...');
        
        // Buscar usuarios que no tienen el campo twoFactorEnabled
        const usersToUpdate = await User.find({
            $or: [
                { twoFactorEnabled: { $exists: false } },
                { twoFactorSecret: { $exists: false } }
            ]
        });

        console.log(`📊 Usuarios encontrados: ${usersToUpdate.length}`);

        if (usersToUpdate.length === 0) {
            console.log('✅ Todos los usuarios ya tienen los campos 2FA');
            process.exit(0);
        }

        console.log('\n🔄 Actualizando usuarios...');
        
        // Actualizar todos los usuarios
        const result = await User.updateMany(
            {
                $or: [
                    { twoFactorEnabled: { $exists: false } },
                    { twoFactorSecret: { $exists: false } }
                ]
            },
            {
                $set: {
                    twoFactorEnabled: false,
                    twoFactorSecret: null
                }
            }
        );

        console.log(`✅ Usuarios actualizados: ${result.modifiedCount}`);
        
        // Verificar actualización
        console.log('\n🔍 Verificando actualización...');
        const verifyUsers = await User.find({ twoFactorEnabled: { $exists: false } });
        
        if (verifyUsers.length === 0) {
            console.log('✅ Migración completada exitosamente');
            console.log('\n📊 Resumen:');
            console.log(`   - Usuarios actualizados: ${result.modifiedCount}`);
            console.log(`   - Campo twoFactorEnabled agregado`);
            console.log(`   - Campo twoFactorSecret agregado`);
        } else {
            console.log('⚠️ Algunos usuarios aún no tienen los campos');
        }

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Conexión cerrada');
        process.exit(0);
    }
};

// Ejecutar migración
migrate();
