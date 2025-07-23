const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxLength: [200, 'El título no puede exceder 200 caracteres']
  },
  descripcion: {
    type: String,
    default: '',
    trim: true,
    maxLength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  estado: {
    type: String,
    enum: ['pendiente', 'proceso', 'completada'],
    default: 'pendiente'
  },
  completada: {
    type: Boolean,
    default: false
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaCompletada: {
    type: Date,
    default: null
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta'],
    default: 'media'
  }
}, {
  timestamps: true, // Añade createdAt y updatedAt automáticamente
  versionKey: false // Remueve el campo __v
});

// Middleware pre-save para actualizar fechaCompletada
tareaSchema.pre('save', function(next) {
  if (this.isModified('completada')) {
    if (this.completada && !this.fechaCompletada) {
      this.fechaCompletada = new Date();
    } else if (!this.completada) {
      this.fechaCompletada = null;
    }
  }
  next();
});

// Método virtual para obtener el tiempo transcurrido
tareaSchema.virtual('tiempoTranscurrido').get(function() {
  const ahora = new Date();
  const diferencia = ahora - this.fechaCreacion;
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (dias > 0) {
    return `${dias} día${dias > 1 ? 's' : ''} y ${horas} hora${horas !== 1 ? 's' : ''}`;
  }
  return `${horas} hora${horas !== 1 ? 's' : ''}`;
});

// Configurar para incluir virtuals en JSON
tareaSchema.set('toJSON', { virtuals: true });
tareaSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tarea', tareaSchema);
