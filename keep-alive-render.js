#!/usr/bin/env node

/**
 * Keep-Alive Script para chatentiemporealv2.onrender.com
 * Ejecuta: node keep-alive-render.js
 * 
 * Este script hace ping al backend cada 10 minutos para mantenerlo activo
 */

const https = require('https');

// Configuración específica para tu backend
const BACKEND_URL = 'https://chatentiemporealv2.onrender.com';
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutos
const HEALTH_ENDPOINT = '/health';
const KEEPALIVE_ENDPOINT = '/api/keep-alive';

console.log('🚀 Keep-Alive iniciado para chatentiemporealv2.onrender.com');
console.log(`⏱️  Intervalo: ${PING_INTERVAL / 60000} minutos\n`);

const pingEndpoint = (endpoint, label) => {
    const startTime = Date.now();
    const url = `${BACKEND_URL}${endpoint}`;
    
    return new Promise((resolve, reject) => {
        console.log(`🔄 ${label}: ${url}...`);
        
        const req = https.get(url, (res) => {
            const latency = Date.now() - startTime;
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const response = JSON.parse(data);
                        console.log(`✅ ${label} exitoso`);
                        console.log(`   Status: ${response.status || 'alive'}`);
                        if (response.uptime) {
                            console.log(`   Uptime: ${Math.floor(response.uptime / 60)}m ${Math.floor(response.uptime % 60)}s`);
                        }
                        console.log(`   Latencia: ${latency}ms`);
                        console.log(`   Tiempo: ${new Date().toLocaleString('es-ES')}\n`);
                        resolve({ success: true, latency, response });
                    } catch (e) {
                        console.log(`✅ ${label} exitoso (${res.statusCode})`);
                        console.log(`   Latencia: ${latency}ms\n`);
                        resolve({ success: true, latency });
                    }
                } else {
                    console.warn(`⚠️  ${label} retornó status ${res.statusCode}`);
                    console.log(`   Latencia: ${latency}ms\n`);
                    resolve({ success: false, statusCode: res.statusCode, latency });
                }
            });
        });
        
        req.on('error', (error) => {
            console.error(`❌ ${label} falló: ${error.message}\n`);
            reject(error);
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            console.error(`❌ ${label} timeout (30s)\n`);
            reject(new Error('Timeout'));
        });
    });
};

const performPing = async () => {
    console.log(`${'='.repeat(60)}`);
    console.log(`📍 Ping #${pingCount++} - ${new Date().toLocaleString('es-ES')}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
        // Ping al endpoint keep-alive
        await pingEndpoint(KEEPALIVE_ENDPOINT, 'Keep-Alive');
        
        // Ping al health check
        await pingEndpoint(HEALTH_ENDPOINT, 'Health Check');
        
        console.log('✅ Ambos pings completados exitosamente\n');
    } catch (error) {
        console.error('❌ Error durante el ping:', error.message, '\n');
    }
};

let pingCount = 1;

// Ejecutar inmediatamente
performPing();

// Ejecutar cada 10 minutos
const intervalId = setInterval(performPing, PING_INTERVAL);

// Manejar señales de terminación
const shutdown = (signal) => {
    console.log(`\n🛑 ${signal} recibido, deteniendo Keep-Alive...`);
    clearInterval(intervalId);
    console.log('✅ Keep-Alive detenido correctamente');
    console.log(`📊 Total de pings realizados: ${pingCount - 1}\n`);
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT (Ctrl+C)'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Mantener el proceso vivo
console.log('⏳ Esperando próximo ping en 10 minutos...');
console.log('   Presiona Ctrl+C para detener\n');
