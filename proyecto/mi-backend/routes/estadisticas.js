const express = require('express');
const Tarea = require('../models/Tarea');
const router = express.Router();

// Obtener estadísticas generales
router.get('/', async (req, res) => {
  try {
    const total = await Tarea.countDocuments();
    const completadas = await Tarea.countDocuments({ completada: true });
    const pendientes = total - completadas;
    
    // Estadísticas por prioridad
    const prioridades = await Tarea.aggregate([
      {
        $group: {
          _id: '$prioridad',
          total: { $sum: 1 },
          completadas: {
            $sum: {
              $cond: [{ $eq: ['$completada', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Tareas creadas en los últimos 7 días
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    
    const tareasRecientes = await Tarea.countDocuments({
      fechaCreacion: { $gte: hace7Dias }
    });

    // Tareas completadas hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);
    
    const completadasHoy = await Tarea.countDocuments({
      completada: true,
      fechaCompletada: {
        $gte: hoy,
        $lt: mañana
      }
    });

    res.json({
      success: true,
      data: {
        resumen: {
          total,
          completadas,
          pendientes,
          porcentajeCompletado: total > 0 ? Math.round((completadas / total) * 100) : 0
        },
        prioridades: prioridades.reduce((acc, item) => {
          acc[item._id] = {
            total: item.total,
            completadas: item.completadas,
            pendientes: item.total - item.completadas
          };
          return acc;
        }, {}),
        actividad: {
          tareasRecientes,
          completadasHoy
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// Obtener estadísticas por periodo
router.get('/periodo', async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const diasNum = parseInt(dias);
    
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - diasNum);

    const estadisticasPorDia = await Tarea.aggregate([
      {
        $match: {
          fechaCreacion: { $gte: fechaInicio }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$fechaCreacion'
            }
          },
          creadas: { $sum: 1 },
          completadas: {
            $sum: {
              $cond: [{ $eq: ['$completada', true] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        periodo: `${diasNum} días`,
        fechaInicio: fechaInicio.toISOString().split('T')[0],
        fechaFin: new Date().toISOString().split('T')[0],
        estadisticas: estadisticasPorDia
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas por periodo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por periodo',
      error: error.message
    });
  }
});

module.exports = router;
