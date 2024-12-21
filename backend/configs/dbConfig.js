const mongoose = require('mongoose');
require('dotenv').config(); // Para usar el .env

const mongoURI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI); // Sin las opciones deprecadas
    console.log('Connected to MongoDB - Chat tiempo real anonimo');
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1); // Cierra la app si no se puede conectar a la base de datos
  }
};

module.exports = connectDB;
