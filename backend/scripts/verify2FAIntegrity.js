/**
 * Script para verificar la integridad de los campos 2FA
 * Este script verifica que ningún usuario haya perdido su configuración de 2FA
 * 
 * Ejecutar: node scripts/verify2FAIntegrity.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const verifyIntegrity = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        // 1. Verificar usuarios con 2FA habilitado pero sin secret
        console.log('🔍 Buscando usuarios con 2FA habilitado pero sin secret...');
        const usersWithout2FASecret = await User.find({
            twoFactorEnabled: true,
            $or: [
                { twoFactorSecret: null },
                { twoFactorSecret: { $exists: false } }
            ]
        });

        if (usersWithout2FASecret.length > 0) {
            console.log(`⚠️  PROBLEMA ENCONTRADO: ${usersWithout2FASecret.length} usuario(s) con 2FA habilitado pero sin secret`);
            usersWithout2FASecret.forEach(user => {
                console.log(`   - ${user.username} (ID: ${user._id})`);
            });
            console.log('\n⚠️  ACCIÓN REQUERIDA: Estos usuarios deben reconfigurar su 2FA\n');
        } else {
            console.log('✅ No se encontraron usuarios con 2FA inconsistente\n');
        }

        // 2. Verificar usuarios con secret pero 2FA deshabilitado
        console.log('🔍 Buscando usuarios con secret pero 2FA deshabilitado...');
        const usersWithSecretDisabled = await User.find({
            twoFactorEnabled: false,
            twoFactorSecret: { $ne: null, $exists: true }
        });

        if (usersWithSecretDisabled.length > 0) {
            console.log(`⚠️  ADVERTENCIA: ${usersWithSecretDisabled.length} usuario(s) con secret residual`);
            usersWithSecretDisabled.forEach(user => {
                console.log(`   - ${user.username} (Secret debería ser null)`);
            });
            
            // Limpiar secrets residuales
            console.log('\n🧹 Limpiando secrets residuales...');
            const cleanResult = await User.updateMany(
                {
                    twoFactorEnabled: false,
                    twoFactorSecret: { $ne: null }
                },
                {
                    $set: { twoFactorSecret: null }
                }
            );
            console.log(`✅ ${cleanResult.modifiedCount} secrets residuales limpiados\n`);
        } else {
            console.log('✅ No se encontraron secrets residuales\n');
        }

        // 3. Verificar usuarios sin campos de 2FA
        console.log('🔍 Buscando usuarios sin campos de 2FA...');
        const usersWithoutFields = await User.find({
            $or: [
                { twoFactorEnabled: { $exists: false } },
                { twoFactorSecret: { $exists: false } }
            ]
        });

        if (usersWithoutFields.length > 0) {
            console.log(`⚠️  PROBLEMA: ${usersWithoutFields.length} usuario(s) sin campos de 2FA`);
            usersWithoutFields.forEach(user => {
                console.log(`   - ${user.username} (Missing fields)`);
            });
            
            console.log('\n🔧 Inicializando campos faltantes...');
            const initResult = await User.updateMany(
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
            console.log(`✅ ${initResult.modifiedCount} usuarios inicializados\n`);
        } else {
            console.log('✅ Todos los usuarios tienen campos de 2FA\n');
        }

        // 4. Resumen final
        console.log('📊 RESUMEN DE INTEGRIDAD:');
        const totalUsers = await User.countDocuments();
        const users2FAEnabled = await User.countDocuments({ twoFactorEnabled: true });
        const users2FADisabled = await User.countDocuments({ twoFactorEnabled: false });
        
        console.log(`   Total de usuarios: ${totalUsers}`);
        console.log(`   Con 2FA habilitado: ${users2FAEnabled}`);
        console.log(`   Con 2FA deshabilitado: ${users2FADisabled}`);
        
        // Verificar integridad de los usuarios con 2FA
        const validUsers2FA = await User.countDocuments({
            twoFactorEnabled: true,
            twoFactorSecret: { $ne: null, $exists: true }
        });
        
        console.log(`   2FA configurado correctamente: ${validUsers2FA}/${users2FAEnabled}`);
        
        if (validUsers2FA === users2FAEnabled) {
            console.log('\n✅ ¡Integridad verificada! Todos los usuarios con 2FA tienen configuración válida');
        } else {
            console.log('\n⚠️  Algunos usuarios con 2FA requieren reconfiguración');
        }

        // Crear log de auditoría
        await AuditLog.create({
            action: 'VERIFY_2FA_INTEGRITY',
            username: 'system',
            ipAddress: 'localhost',
            details: {
                totalUsers,
                users2FAEnabled,
                validUsers2FA,
                usersWithoutSecret: usersWithout2FASecret.length,
                usersWithResidualSecret: usersWithSecretDisabled.length
            }
        });

    } catch (error) {
        console.error('❌ Error verificando integridad:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Conexión cerrada');
        process.exit(0);
    }
};

// Ejecutar verificación
verifyIntegrity();
