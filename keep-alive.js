#!/usr/bin/env node

/**
 * Keep-Alive Script
 * Pings el servidor cada 10 minutos para prevenir sleep en Render
 * 
 * Uso:
 *   node keep-alive.js https://tu-backend.onrender.com
 * 
*/

const https = require('https');
const http = require('http');

// Configuración
const BACKEND_URL = process.argv[2] || process.env.BACKEND_URL || 'https://chatentiemporealv2.onrender.com';
const PING_INTERVAL = parseInt(process.env.PING_INTERVAL) || 10 * 60 * 1000; // 10 minutos
const ENDPOINT = '/api/keep-alive';

if (!BACKEND_URL) {
    console.error('❌ Error: Debes proporcionar la URL del backend');
    console.error('Uso: node keep-alive.js https://chatentiemporealv2.onrender.com');
    process.exit(1);
}

const pingServer = () => {
    const url = new URL(ENDPOINT, BACKEND_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    const startTime = Date.now();
    
    console.log(`🔄 Pinging ${url.href}...`);
    
    const req = protocol.get(url.href, (res) => {
        const latency = Date.now() - startTime;
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            if (res.statusCode === 200) {
                try {
                    const response = JSON.parse(data);
                    console.log(`✅ Ping successful - Status: ${response.status}, Latency: ${latency}ms, Time: ${new Date().toISOString()}`);
                } catch (e) {
                    console.log(`✅ Ping successful - Latency: ${latency}ms, Status: ${res.statusCode}`);
                }
            } else {
                console.warn(`⚠️  Ping returned status ${res.statusCode} - Latency: ${latency}ms`);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error(`❌ Ping failed: ${error.message}`);
    });
    
    req.setTimeout(30000, () => {
        req.destroy();
        console.error('❌ Ping timeout (30s)');
    });
};

// Ejecutar inmediatamente
console.log(`🚀 Keep-Alive Script iniciado`);
console.log(`📍 Backend URL: ${BACKEND_URL}`);
console.log(`⏱️  Intervalo: ${PING_INTERVAL / 1000}s (${PING_INTERVAL / 60000} minutos)`);
console.log('');

pingServer();

// Ejecutar cada X minutos
setInterval(pingServer, PING_INTERVAL);

// Manejar señales de terminación
process.on('SIGINT', () => {
    console.log('\n🛑 Keep-Alive Script detenido');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Keep-Alive Script terminado');
    process.exit(0);
});
