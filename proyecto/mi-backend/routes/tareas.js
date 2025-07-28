const express = require('express');
const Tarea = require('../models/Tarea');
const router = express.Router();

// Obtener todas las tareas
router.get('/', async (req, res) => {
  try {
    const { completada, prioridad, ordenar = 'fechaCreacion', direccion = 'desc' } = req.query;
    
    // Construir filtros
    const filtros = {};
    if (completada !== undefined) {
      filtros.completada = completada === 'true';
    }
    if (prioridad) {
      filtros.prioridad = prioridad;
    }

    // Configurar ordenamiento
    const sortOrder = direccion === 'asc' ? 1 : -1;
    const sortObject = { [ordenar]: sortOrder };

    const tareas = await Tarea.find(filtros).sort(sortObject);
    
    res.json({
      success: true,
      data: tareas,
      total: tareas.length,
      filtros: filtros
    });
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las tareas',
      error: error.message
    });
  }
});

// Obtener una tarea por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tarea = await Tarea.findById(id);

    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    res.json({
      success: true,
      data: tarea
    });
  } catch (error) {
    console.error('Error al obtener tarea:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la tarea',
      error: error.message
    });
  }
});

// Crear nueva tarea
router.post('/', async (req, res) => {
  try {
    const { titulo, descripcion, prioridad, fechaEntrega } = req.body;
    
    // Validaciones básicas
    if (!titulo || titulo.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El título es obligatorio'
      });
    }


    // Si la fechaEntrega viene como string yyyy-mm-dd, convertir a Date local a medianoche
    let fechaEntregaDate = null;
    if (fechaEntrega) {
      if (typeof fechaEntrega === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaEntrega)) {
        // yyyy-mm-dd a Date local (no UTC)
        const [year, month, day] = fechaEntrega.split('-').map(Number);
        fechaEntregaDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      } else {
        fechaEntregaDate = fechaEntrega;
      }
    }

    const nuevaTarea = new Tarea({
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || '',
      prioridad: prioridad || 'media',
      fechaEntrega: fechaEntregaDate
    });

    const tareaGuardada = await nuevaTarea.save();
    
    res.status(201).json({
      success: true,
      message: 'Tarea creada exitosamente',
      data: tareaGuardada
    });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear la tarea',
      error: error.message
    });
  }
});

// Actualizar tarea
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completada, titulo, descripcion, prioridad, estado, fechaEntrega } = req.body;

    const updateData = {};
    
    if (typeof completada === 'boolean') {
      updateData.completada = completada;
      // Actualizar estado basado en completada
      updateData.estado = completada ? 'completada' : 'pendiente';
      updateData.fechaCompletada = completada ? new Date() : null;
    }
    
    if (estado && ['pendiente', 'proceso', 'completada'].includes(estado)) {
      updateData.estado = estado;
      updateData.completada = estado === 'completada';
      updateData.fechaCompletada = estado === 'completada' ? new Date() : null;
    }
    
    if (titulo !== undefined && titulo.trim() !== '') {
      updateData.titulo = titulo.trim();
    }
    
    if (descripcion !== undefined) {
      updateData.descripcion = descripcion.trim();
    }

    if (prioridad && ['baja', 'media', 'alta'].includes(prioridad)) {
      updateData.prioridad = prioridad;
    }

    if (fechaEntrega !== undefined) {
      if (fechaEntrega && typeof fechaEntrega === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaEntrega)) {
        // yyyy-mm-dd a Date local (no UTC)
        const [year, month, day] = fechaEntrega.split('-').map(Number);
        updateData.fechaEntrega = new Date(year, month - 1, day, 0, 0, 0, 0);
      } else {
        updateData.fechaEntrega = fechaEntrega || null;
      }
    }

    const tareaActualizada = await Tarea.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!tareaActualizada) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Tarea actualizada exitosamente',
      data: tareaActualizada
    });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la tarea',
      error: error.message
    });
  }
});

// Alternar estado completado de una tarea
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tarea = await Tarea.findById(id);

    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    tarea.completada = !tarea.completada;
    const tareaActualizada = await tarea.save();

    res.json({
      success: true,
      message: `Tarea ${tareaActualizada.completada ? 'completada' : 'marcada como pendiente'}`,
      data: tareaActualizada
    });
  } catch (error) {
    console.error('Error al alternar estado de tarea:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado de la tarea',
      error: error.message
    });
  }
});

// Eliminar todas las tareas completadas
router.delete('/completadas/bulk', async (req, res) => {
  try {
    const resultado = await Tarea.deleteMany({ completada: true });

    res.json({
      success: true,
      message: `${resultado.deletedCount} tarea${resultado.deletedCount !== 1 ? 's' : ''} completada${resultado.deletedCount !== 1 ? 's' : ''} eliminada${resultado.deletedCount !== 1 ? 's' : ''}`,
      eliminadas: resultado.deletedCount
    });
  } catch (error) {
    console.error('Error al eliminar tareas completadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar las tareas completadas',
      error: error.message
    });
  }
});

// Eliminar tarea
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tareaEliminada = await Tarea.findByIdAndDelete(id);

    if (!tareaEliminada) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Tarea eliminada exitosamente',
      data: tareaEliminada
    });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la tarea',
      error: error.message
    });
  }
});

module.exports = router;
