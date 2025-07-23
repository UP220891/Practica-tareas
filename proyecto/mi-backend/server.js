const express = require('express');
const connectDB = require('./config/database');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde el directorio padre
app.use(express.static(path.join(__dirname, '..')));

connectDB(); // Conectar a la base de datos

// Importar rutas
const tareasRoutes = require('./routes/tareas');
const estadisticasRoutes = require('./routes/estadisticas');

app.use('/api/tareas', tareasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    mensaje: '✅ API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      tareas: '/api/tareas',
      estadisticas: '/api/estadisticas'
    }
  });
});

app.get('/', (req, res) => {
  res.send('¡Servidor de Tareas funcionando correctamente!');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
