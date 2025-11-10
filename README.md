# Sistema de Chat en Tiempo Real con Salas Seguras

**Universidad de las Fuerzas Armadas ESPE**  
**Desarrollo de Software Seguro**

## 🚀 Inicio Rápido

### Instalación

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configurar variables
npm start

# Frontend (nueva terminal)
cd frontend
npm install
cp .env.example .env  # Configurar variables
npm start
```

### Acceso

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

## 📚 Documentación

Ver [DOCUMENTACION.md](./DOCUMENTACION.md) para la guía completa.

## 📋 Requisitos

Ver [cambios.md](./cambios.md) para los requisitos del proyecto.

## ✨ Características Principales

✅ Chat en tiempo real con WebSockets  
✅ Salas de texto y multimedia  
✅ Autenticación 2FA con TOTP  
✅ Encriptación end-to-end (AES-256-GCM)  
✅ Detección de esteganografía (7 algoritmos)  
✅ Worker threads para concurrencia  
✅ Logs auditables con firmas HMAC-SHA256  
✅ Mensajes de voz integrados  

## 🔒 Seguridad

- **Confidencialidad**: TLS/SSL + AES-256
- **Integridad**: HMAC-SHA256 + detección de esteganografía
- **Autenticación**: JWT + 2FA (TOTP)
- **No Repudio**: Logs inmutables firmados
- **OWASP Top 10**: helmet.js + validación de entradas

## 🛠️ Stack Tecnológico

**Backend**: Node.js + Express + Socket.IO + MongoDB  
**Frontend**: React.js + Socket.IO Client  
**Seguridad**: JWT + bcrypt + speakeasy + AES-256  
**Cloud**: Render + Vercel + MongoDB Atlas + Cloudinary

## 📊 Estado del Proyecto

**Cumplimiento de Requisitos**: ✅ 100% (13/13)  
**Cobertura de Tests**: 70%+  
**Usuarios Simultáneos**: 50+  
**Latencia de Mensajes**: < 1 segundo

---

**Fecha**: Noviembre 2025
