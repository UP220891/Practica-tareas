// ============================================
// 🚀 GESTOR DE TAREAS - FRONTEND API
// ============================================

// Variables globales
let tareas = [];
let filtroActual = 'todas';
let tareaEditandoId = null; // Para saber si estamos editando

// Configuración de la API
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',
    ENDPOINTS: {
        TAREAS: '/tareas',
        ESTADISTICAS: '/estadisticas',
        TEST: '/test'
    }
};

// Estado global de la aplicación
let appState = {
    tareas: [],
    filtroActivo: 'todas',
    cargando: false
};

// ============================================
// 🔧 UTILIDADES
// ============================================

// Mostrar/ocultar loading
function mostrarLoading(mostrar = true) {
    const loading = document.getElementById('loading');
    loading.style.display = mostrar ? 'flex' : 'none';
    appState.cargando = mostrar;
}

// Formatear fecha
function formatearFecha(fecha) {
    const ahora = new Date();
    const fechaTarea = new Date(fecha);
    const diferencia = ahora - fechaTarea;
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    if (minutos < 60) return `hace ${minutos} min`;
    if (horas < 24) return `hace ${horas}h`;
    if (dias < 7) return `hace ${dias}d`;
    
    return fechaTarea.toLocaleDateString('es-ES');
}

// Formatear fecha de entrega
function formatearFechaEntrega(fecha) {
    const fechaEntrega = new Date(fecha);
    const ahora = new Date();
    const diferencia = fechaEntrega - ahora;
    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    if (dias < 0) {
        return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) > 1 ? 's' : ''}`;
    } else if (dias === 0) {
        return 'Vence hoy';
    } else if (dias === 1) {
        return 'Vence mañana';
    } else if (dias <= 7) {
        return `En ${dias} días`;
    } else {
        return fechaEntrega.toLocaleDateString('es-ES');
    }
}

// Verificar si una fecha está vencida
function esFechaVencida(fecha) {
    const fechaEntrega = new Date(fecha);
    const ahora = new Date();
    ahora.setHours(23, 59, 59, 999); // Final del día actual
    return fechaEntrega < ahora;
}

// Verificar si una fecha está cercana (dentro de 3 días)
function esFechaCercana(fecha) {
    const fechaEntrega = new Date(fecha);
    const ahora = new Date();
    const diferencia = fechaEntrega - ahora;
    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 3;
}

// ============================================
// 🔔 SISTEMA DE NOTIFICACIONES MEJORADO
// ============================================

// Función de confirmación personalizada
function mostrarConfirmacion(mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmation-modal');
        const messageElement = document.getElementById('confirmation-message');
        const cancelBtn = document.getElementById('confirmation-cancel');
        const acceptBtn = document.getElementById('confirmation-accept');

        messageElement.textContent = mensaje;
        modal.style.display = 'flex';

        // Remover event listeners anteriores
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newAcceptBtn = acceptBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);

        // Agregar nuevos event listeners
        newCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            resolve(false);
        });

        newAcceptBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            resolve(true);
        });

        // Cerrar al hacer clic en overlay
        modal.querySelector('.confirmation-overlay').addEventListener('click', () => {
            modal.style.display = 'none';
            resolve(false);
        });

        // Cerrar con ESC
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                resolve(false);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

// Mostrar notificación moderna
function mostrarNotificacion(mensaje, tipo = 'success', duracion = 4000) {
    // Verificar que el contenedor existe
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Crear notificación
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    toast.className = `toast toast-${tipo}`;

    // Iconos y colores según el tipo
    const iconos = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };

    // Estructura de la notificación
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${iconos[tipo] || iconos.success}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-message">${mensaje}</div>
        </div>
        <button class="toast-close" onclick="cerrarNotificacion('${toastId}')">
            <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress">
            <div class="toast-progress-bar"></div>
        </div>
    `;

    // Añadir al contenedor
    container.appendChild(toast);

    // Animación de entrada
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);

    // Barra de progreso
    const progressBar = toast.querySelector('.toast-progress-bar');
    if (progressBar) {
        progressBar.style.animation = `toastProgress ${duracion}ms linear forwards`;
    }

    // Auto-cerrar
    const timeoutId = setTimeout(() => {
        cerrarNotificacion(toastId);
    }, duracion);

    // Pausar al hover
    toast.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
        progressBar.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
        const remainingTime = duracion * (1 - (progressBar.offsetWidth / progressBar.parentElement.offsetWidth));
        setTimeout(() => cerrarNotificacion(toastId), remainingTime);
        progressBar.style.animationPlayState = 'running';
    });

    return toastId;
}

// Cerrar notificación específica
function cerrarNotificacion(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.add('toast-hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// Limpiar todas las notificaciones
function limpiarNotificaciones() {
    const container = document.getElementById('toast-container');
    if (container) {
        const toasts = container.querySelectorAll('.toast');
        toasts.forEach(toast => {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
    }
}

// Notificaciones específicas para diferentes acciones
function notificarExito(mensaje, duracion = 4000) {
    return mostrarNotificacion(mensaje, 'success', duracion);
}

function notificarError(mensaje, duracion = 5000) {
    return mostrarNotificacion(mensaje, 'error', duracion);
}

function notificarAdvertencia(mensaje, duracion = 4500) {
    return mostrarNotificacion(mensaje, 'warning', duracion);
}

function notificarInfo(mensaje, duracion = 4000) {
    return mostrarNotificacion(mensaje, 'info', duracion);
}

// Notificación especial para tarea completada
function notificarTareaCompletada(titulo) {
    return notificarExito(`¡Tarea "${titulo}" completada! 🎉✨`, 5000);
}

// Notificación especial para tarea eliminada
function notificarTareaEliminada() {
    return mostrarNotificacion('Tarea eliminada correctamente 🗑️', 'warning', 3500);
}

// Función de demostración de notificaciones (para pruebas)
function demostrarNotificaciones() {
    setTimeout(() => notificarExito('¡Operación exitosa! 🎉'), 500);
    setTimeout(() => notificarInfo('Información importante ℹ️'), 1500);
    setTimeout(() => notificarAdvertencia('Advertencia: Revisa los datos ⚠️'), 2500);
    setTimeout(() => notificarError('Error de ejemplo ❌'), 3500);
    setTimeout(() => notificarTareaCompletada('Tarea de prueba'), 4500);
}

// ============================================
// 🌐 FUNCIONES DE API
// ============================================

// Realizar petición HTTP
async function realizarPeticion(endpoint, opciones = {}) {
    try {
        mostrarLoading(true);
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...opciones
        };

        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Error ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('Error en petición:', error);
        notificarError(`Error: ${error.message}`);
        throw error;
    } finally {
        mostrarLoading(false);
    }
}

// Obtener todas las tareas
async function obtenerTareas(filtros = {}) {
    try {
        const queryParams = new URLSearchParams(filtros).toString();
        const endpoint = `${API_CONFIG.ENDPOINTS.TAREAS}${queryParams ? `?${queryParams}` : ''}`;
        
        const response = await realizarPeticion(endpoint);
        tareas = response.data || [];
        
        renderizarTareas();
        actualizarContadores();
        
        return tareas;
    } catch (error) {
        console.error('Error obteniendo tareas:', error);
    }
}

// Crear nueva tarea
async function crearTareaNueva(datosTarea) {
    try {
        const response = await realizarPeticion(API_CONFIG.ENDPOINTS.TAREAS, {
            method: 'POST',
            body: JSON.stringify(datosTarea)
        });

        notificarExito('¡Tarea creada exitosamente! 🎉');
        await obtenerTareas(); // Recargar lista
        return response.data;
    } catch (error) {
        console.error('Error creando tarea:', error);
        notificarError('Error al crear la tarea');
    }
}

// Actualizar tarea
async function actualizarTarea(id, datosActualizacion) {
    try {
        const response = await realizarPeticion(`${API_CONFIG.ENDPOINTS.TAREAS}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(datosActualizacion)
        });

        notificarExito('Tarea actualizada exitosamente! ✨');
        await obtenerTareas(); // Recargar lista
        return response.data;
    } catch (error) {
        console.error('Error actualizando tarea:', error);
        notificarError('Error al actualizar la tarea');
    }
}

// Alternar estado de tarea
async function alternarEstadoTarea(id) {
    try {
        const response = await realizarPeticion(`${API_CONFIG.ENDPOINTS.TAREAS}/${id}/toggle`, {
            method: 'PATCH'
        });

        notificarExito(response.message || 'Estado de tarea actualizado! ✨');
        await obtenerTareas(); // Recargar lista
        return response.data;
    } catch (error) {
        console.error('Error alternando estado:', error);
        notificarError('Error al cambiar el estado de la tarea');
    }
}

// Eliminar tarea
async function eliminarTarea(id) {
    try {
        const response = await realizarPeticion(`${API_CONFIG.ENDPOINTS.TAREAS}/${id}`, {
            method: 'DELETE'
        });

        notificarTareaEliminada();
        await obtenerTareas(); // Recargar lista
        return response;
    } catch (error) {
        console.error('Error eliminando tarea:', error);
        notificarError('Error al eliminar la tarea');
    }
}

// Eliminar tareas completadas
async function eliminarTareasCompletadas() {
    const confirmado = await mostrarConfirmacion('¿Estás seguro de eliminar todas las tareas completadas?');
    if (!confirmado) {
        return;
    }

    try {
        const response = await realizarPeticion(`${API_CONFIG.ENDPOINTS.TAREAS}/completadas/bulk`, {
            method: 'DELETE'
        });

        notificarExito(response.message || 'Tareas completadas eliminadas! 🗑️✨');
        await obtenerTareas(); // Recargar lista
        return response;
    } catch (error) {
        console.error('Error eliminando tareas completadas:', error);
        notificarError('Error al limpiar tareas completadas');
    }
}

// Obtener estadísticas
async function obtenerEstadisticas() {
    try {
        const response = await realizarPeticion(API_CONFIG.ENDPOINTS.ESTADISTICAS);
        return response.data;
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
    }
}

// ============================================
// 🎨 FUNCIONES DE INTERFAZ
// ============================================

// Mostrar/ocultar formulario
function mostrarFormulario() {
    const formulario = document.getElementById('form-section');
    formulario.classList.add('show');
    limpiarFormulario();
    setTimeout(() => {
        document.getElementById('titulo').focus();
    }, 100);
}

function ocultarFormulario() {
    const formulario = document.getElementById('form-section');
    formulario.classList.remove('show');
    
    // Resetear el formulario a modo "crear"
    document.querySelector('.form-title').innerHTML = '<i class="fas fa-sparkles"></i> Nueva Tarea';
    document.querySelector('.form-actions .btn-primary').innerHTML = '<i class="fas fa-magic"></i> Crear Tarea';
    
    tareaEditandoId = null;
    limpiarFormulario();
}

// Limpiar formulario
function limpiarFormulario() {
    document.getElementById('titulo').value = '';
    document.getElementById('descripcion').value = '';
    document.getElementById('fechaEntrega').value = '';
    
    // Resetear la prioridad al valor por defecto (media)
    const prioridadRadio = document.querySelector('input[name="prioridad"][value="media"]');
    if (prioridadRadio) {
        prioridadRadio.checked = true;
    }
}

// Crear tarea desde el formulario
async function crearTarea() {
    const titulo = document.getElementById('titulo').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const fechaEntrega = document.getElementById('fechaEntrega').value;
    
    // Obtener la prioridad seleccionada de los radio buttons
    const prioridadRadio = document.querySelector('input[name="prioridad"]:checked');
    const prioridad = prioridadRadio ? prioridadRadio.value : 'media';

    // Validaciones
    if (!titulo) {
        notificarError('El título es obligatorio', 3000);
        document.getElementById('titulo').focus();
        return;
    }

    if (titulo.length < 3) {
        notificarAdvertencia('El título debe tener al menos 3 caracteres', 3000);
        return;
    }

    // Validar fecha de entrega (opcional pero si se proporciona debe ser válida)
    if (fechaEntrega) {
        const fechaSeleccionada = new Date(fechaEntrega);
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0); // Normalizar la fecha actual
        
        if (fechaSeleccionada < fechaActual) {
            notificarAdvertencia('La fecha de entrega no puede ser anterior a hoy', 3000);
            document.getElementById('fechaEntrega').focus();
            return;
        }
    }

    try {
        if (tareaEditandoId) {
            // Estamos editando una tarea existente
            const response = await realizarPeticion(`${API_CONFIG.ENDPOINTS.TAREAS}/${tareaEditandoId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    titulo,
                    descripcion,
                    prioridad,
                    fechaEntrega: fechaEntrega || null
                })
            });

            if (response.success) {
                notificarExito('¡Tarea actualizada exitosamente! ✨');
                ocultarFormulario();
                await obtenerTareas();
            }
        } else {
            // Crear nueva tarea
            const nuevaTarea = {
                titulo,
                descripcion,
                prioridad,
                fechaEntrega: fechaEntrega || null
            };

            const tareaCreada = await crearTareaNueva(nuevaTarea);
            
            if (tareaCreada) {
                ocultarFormulario();
            }
        }
    } catch (error) {
        console.error('Error al procesar tarea:', error);
        notificarError('Error al procesar la tarea');
    }
}

// Renderizar lista de tareas
function renderizarTareas() {
    const container = document.getElementById('lista-tareas');
    
    // Filtrar tareas según el filtro activo
    let tareasFiltradas = tareas;
    
    switch (filtroActual) {
        case 'completadas':
            tareasFiltradas = tareas.filter(t => t.estado === 'completada' || t.completada);
            break;
        case 'pendientes':
            tareasFiltradas = tareas.filter(t => t.estado === 'pendiente' || (!t.completada && (!t.estado || t.estado === 'pendiente')));
            break;
        case 'proceso':
            tareasFiltradas = tareas.filter(t => t.estado === 'proceso');
            break;
        default:
            tareasFiltradas = tareas;
    }

    // Si no hay tareas, mostrar estado vacío
    if (tareasFiltradas.length === 0) {
        let mensaje = '¡No hay tareas!';
        let descripcion = 'Agrega tu primera tarea para comenzar';
        
        if (filtroActual === 'completadas') {
            mensaje = '¡No hay tareas completadas!';
            descripcion = 'Completa algunas tareas para verlas aquí';
        } else if (filtroActual === 'pendientes') {
            mensaje = '¡No hay tareas pendientes!';
            descripcion = '¡Todas las tareas están completadas! 🎉';
        } else if (filtroActual === 'proceso') {
            mensaje = '¡No hay tareas en proceso!';
            descripcion = 'Marca algunas tareas como "En Proceso"';
        }

        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>${mensaje}</h3>
                <p>${descripcion}</p>
            </div>
        `;
        return;
    }

    // Renderizar tareas
    const tareasHTML = tareasFiltradas.map(tarea => {
        const estado = tarea.estado || (tarea.completada ? 'completada' : 'pendiente');
        const estadoClass = estado === 'completada' ? 'completed' : estado === 'proceso' ? 'in-progress' : 'pending';
        
        return `
        <div class="task-item ${estadoClass} priority-${tarea.prioridad}" data-id="${tarea._id}" data-fecha="${tarea.fechaCreacion}" data-prioridad="${tarea.prioridad}">
            <div class="task-status">
                <select onchange="cambiarEstado('${tarea._id}', this.value)" class="status-select">
                    <option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                    <option value="proceso" ${estado === 'proceso' ? 'selected' : ''}>🔄 En Proceso</option>
                    <option value="completada" ${estado === 'completada' ? 'selected' : ''}>✅ Completada</option>
                </select>
            </div>
            
            <div class="task-content">
                <div class="task-title">${tarea.titulo}</div>
                ${tarea.descripcion ? `<div class="task-description">${tarea.descripcion}</div>` : ''}
                
                <div class="task-meta">
                    <span class="task-priority ${tarea.prioridad}">
                        ${tarea.prioridad === 'alta' ? '🔴' : tarea.prioridad === 'media' ? '🟡' : '🟢'} 
                        ${tarea.prioridad.charAt(0).toUpperCase() + tarea.prioridad.slice(1)}
                    </span>
                    <span class="task-date">
                        <i class="fas fa-clock"></i> ${formatearFecha(tarea.fechaCreacion)}
                    </span>
                    ${tarea.fechaEntrega ? `
                        <span class="task-due-date ${esFechaVencida(tarea.fechaEntrega) ? 'overdue' : esFechaCercana(tarea.fechaEntrega) ? 'warning' : ''}">
                            <i class="fas fa-calendar-alt"></i> Entrega: ${formatearFechaEntrega(tarea.fechaEntrega)}
                        </span>
                    ` : ''}
                    ${estado === 'completada' && tarea.fechaCompletada ? `
                        <span class="task-completed">
                            <i class="fas fa-check-circle"></i> ${formatearFecha(tarea.fechaCompletada)}
                        </span>
                    ` : ''}
                </div>
            </div>
            
            <div class="task-actions">
                <button class="action-btn edit" onclick="editarTarea('${tarea._id}')" 
                        title="Editar tarea">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="confirmarEliminar('${tarea._id}')" 
                        title="Eliminar tarea">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');

    container.innerHTML = tareasHTML;
    actualizarContadores();
}

// Alternar estado de tarea
async function alternarTarea(id) {
    await alternarEstadoTarea(id);
}

// Confirmar eliminación
async function confirmarEliminar(id) {
    const tarea = tareas.find(t => t._id === id);
    if (!tarea) return;

    const confirmado = await mostrarConfirmacion(`¿Estás seguro de eliminar la tarea "${tarea.titulo}"?`);
    if (confirmado) {
        eliminarTarea(id);
    }
}

// Cambiar estado de tarea
async function cambiarEstado(id, nuevoEstado) {
    try {
        const response = await realizarPeticion(`${API_CONFIG.ENDPOINTS.TAREAS}/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                estado: nuevoEstado
            })
        });

        notificarExito(response.message || 'Estado actualizado correctamente! ✅');
        await obtenerTareas();
    } catch (error) {
        console.error('Error cambiando estado:', error);
        notificarError('Error al cambiar el estado de la tarea');
    }
}

// Editar tarea
function editarTarea(id) {
    const tarea = tareas.find(t => t._id === id);
    if (!tarea) return;

    // Llenar el formulario con los datos de la tarea
    document.getElementById('titulo').value = tarea.titulo;
    document.getElementById('descripcion').value = tarea.descripcion || '';
    
    // Establecer fecha de entrega si existe
    if (tarea.fechaEntrega) {
        const fecha = new Date(tarea.fechaEntrega);
        document.getElementById('fechaEntrega').value = fecha.toISOString().split('T')[0];
    } else {
        document.getElementById('fechaEntrega').value = '';
    }
    
    // Seleccionar la prioridad correcta
    const prioridadRadio = document.querySelector(`input[name="prioridad"][value="${tarea.prioridad}"]`);
    if (prioridadRadio) {
        prioridadRadio.checked = true;
    }

    // Cambiar el título del formulario
    document.querySelector('.form-title').innerHTML = '<i class="fas fa-edit"></i> Editar Tarea';
    document.querySelector('.form-actions .btn-primary').innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
    
    // Establecer que estamos editando
    tareaEditandoId = id;
    
    // Mostrar formulario
    mostrarFormulario();
}

// Filtrar tareas
function filtrarTareas(filtro) {
    // Actualizar filtro activo
    filtroActual = filtro;
    
    // Actualizar botones de filtro
    document.querySelectorAll('.modern-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelector(`[data-filter="${filtro}"]`).classList.add('active');
    
    // Re-renderizar tareas
    renderizarTareas();
}

// Actualizar contadores de las estadísticas y filtros
function actualizarContadores() {
    const total = tareas.length;
    const completadas = tareas.filter(t => t.estado === 'completada' || t.completada).length;
    const pendientes = tareas.filter(t => t.estado === 'pendiente' || (!t.completada && (!t.estado || t.estado === 'pendiente'))).length;
    const proceso = tareas.filter(t => t.estado === 'proceso').length;
    
    // Actualizar estadísticas principales
    document.getElementById('total-tareas').textContent = total;
    document.getElementById('tareas-completadas').textContent = completadas;
    document.getElementById('tareas-pendientes').textContent = pendientes;
    document.getElementById('tareas-proceso').textContent = proceso;
    
    // Calcular y actualizar progreso
    const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;
    document.getElementById('progreso-porcentaje').textContent = `${progreso}%`;
    
    // Actualizar anillo de progreso
    const circle = document.querySelector('.progress-ring-circle');
    if (circle) {
        const circunferencia = 163.36; // 2 * π * radio (26)
        const offset = circunferencia - (progreso / 100) * circunferencia;
        circle.style.strokeDashoffset = offset;
    }
    
    // Actualizar contadores de filtros
    document.getElementById('count-todas').textContent = total;
    document.getElementById('count-completadas').textContent = completadas;
    document.getElementById('count-pendientes').textContent = pendientes;
    document.getElementById('count-proceso').textContent = proceso;
}

// Eliminar tareas completadas
async function eliminarCompletadas() {
    await eliminarTareasCompletadas();
}

// Actualizar estadísticas
async function actualizarEstadisticas() {
    try {
        const stats = await obtenerEstadisticas();
        
        if (stats && stats.resumen) {
            document.getElementById('total-tareas').textContent = stats.resumen.total;
            document.getElementById('tareas-completadas').textContent = stats.resumen.completadas;
            document.getElementById('tareas-pendientes').textContent = stats.resumen.pendientes;
        }
    } catch (error) {
        console.error('Error actualizando estadísticas:', error);
    }
}

// ============================================
// 🚀 INICIALIZACIÓN
// ============================================

// Probar conexión con la API
async function probarConexion() {
    try {
        const response = await realizarPeticion(API_CONFIG.ENDPOINTS.TEST);
        console.log('✅ Conexión con API exitosa:', response);
        return true;
    } catch (error) {
        console.error('❌ Error conectando con API:', error);
        notificarError('No se pudo conectar con el servidor. Verifica que esté ejecutándose.', 6000);
        return false;
    }
}

// Inicializar aplicación
async function inicializarApp() {
    console.log('🚀 Iniciando Gestor de Tareas...');
    
    // Probar conexión
    const conexionOk = await probarConexion();
    
    if (conexionOk) {
        // Cargar datos iniciales
        await obtenerTareas();
        console.log('✅ Aplicación inicializada correctamente');
        
        // Mensaje de bienvenida con nueva notificación
        setTimeout(() => {
            notificarExito('¡Bienvenido al Gestor de Tareas - Equipo Chapo 🚀✨', 4000);
        }, 1000);
    } else {
        // Mostrar modo offline
        document.getElementById('lista-tareas').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wifi" style="color: #f56565;"></i>
                <h3>Sin conexión al servidor</h3>
                <p>Verifica que el servidor backend esté ejecutándose correctamente</p>
                <button class="btn-primary" onclick="location.reload()">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Event listeners para el formulario
document.addEventListener('DOMContentLoaded', () => {
    // Cargar tema guardado
    cargarTema();
    
    // Inicializar app
    inicializarApp();
    
    // Establecer fecha mínima para el campo de fecha de entrega
    const fechaEntregaInput = document.getElementById('fechaEntrega');
    if (fechaEntregaInput) {
        const hoy = new Date().toISOString().split('T')[0];
        fechaEntregaInput.setAttribute('min', hoy);
    }
    
    // Verificar que el botón del calendario esté presente
    const calendarButton = document.getElementById('calendar-button');
    console.log('🔍 Botón de calendario encontrado:', calendarButton ? 'SÍ' : 'NO');
    if (calendarButton) {
        console.log('✅ El botón del calendario está en el DOM');
    } else {
        console.error('❌ El botón del calendario NO está en el DOM');
    }
    
    // Enter para enviar formulario
    document.getElementById('titulo').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            crearTarea();
        }
    });
    
    // ESC para cerrar formulario
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ocultarFormulario();
        }
    });
    
    // Refrescar cada 30 segundos
    setInterval(async () => {
        if (!appState.cargando) {
            await obtenerTareas();
        }
    }, 30000);
});

// Agregar estilos para notificaciones
const notificationStyles = `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// ============================================
// 🎨 EFECTOS VISUALES
// ============================================

// Mostrar confetti
function mostrarConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#667eea', '#f093fb', '#48bb78', '#ed8936', '#f56565'];
    
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.width = (Math.random() * 10 + 5) + 'px';
        confetti.style.height = confetti.style.width;
        
        container.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

// Cambiar tema con efectos suaves
function toggleTheme() {
    console.log('🌙 Cambiando tema...');
    
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    // Agregar efecto de transición
    body.style.transition = 'all 0.5s ease-in-out';
    
    if (body.classList.contains('dark-theme')) {
        // Cambiar a tema claro
        body.classList.remove('dark-theme');
        icon.className = 'fas fa-moon';
        icon.style.transform = 'rotate(0deg)';
        localStorage.setItem('theme', 'light');
        console.log('✅ Tema claro activado');
        
        // Mostrar notificación
        mostrarToast('🌞 Tema claro activado', 'success');
    } else {
        // Cambiar a tema oscuro
        body.classList.add('dark-theme');
        icon.className = 'fas fa-sun';
        icon.style.transform = 'rotate(180deg)';
        localStorage.setItem('theme', 'dark');
        console.log('✅ Tema oscuro activado');
        
        // Mostrar notificación
        mostrarToast('🌙 Tema oscuro activado', 'success');
    }
    
    // Animar el botón
    icon.style.transition = 'transform 0.5s ease-in-out';
}

// Cargar tema guardado
function cargarTema() {
    console.log('🎨 Cargando tema guardado...');
    
    const theme = localStorage.getItem('theme');
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    // Agregar transición suave
    body.style.transition = 'all 0.3s ease-in-out';
    
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        if (icon) {
            icon.className = 'fas fa-sun';
            icon.style.transform = 'rotate(180deg)';
            icon.style.transition = 'transform 0.3s ease-in-out';
        }
        console.log('✅ Tema oscuro cargado');
    } else {
        body.classList.remove('dark-theme');
        if (icon) {
            icon.className = 'fas fa-moon';
            icon.style.transform = 'rotate(0deg)';
            icon.style.transition = 'transform 0.3s ease-in-out';
        }
        console.log('✅ Tema claro cargado');
    }
}

// ============================================
// 🔍 FUNCIONES DE BÚSQUEDA Y FILTROS
// ============================================

// Buscar tareas
function buscarTareas(termino) {
    const tareaElements = document.querySelectorAll('.task-item');
    const terminoLower = termino.toLowerCase();
    
    tareaElements.forEach(tarea => {
        const titulo = tarea.querySelector('.task-title').textContent.toLowerCase();
        const descripcion = tarea.querySelector('.task-description')?.textContent.toLowerCase() || '';
        
        if (titulo.includes(terminoLower) || descripcion.includes(terminoLower)) {
            tarea.style.display = 'flex';
        } else {
            tarea.style.display = 'none';
        }
    });
}

// Ordenar tareas
function ordenarTareas(criterio) {
    const container = document.getElementById('lista-tareas');
    const tareaElements = Array.from(container.querySelectorAll('.task-item'));
    
    tareaElements.sort((a, b) => {
        switch (criterio) {
            case 'fecha-asc':
                return new Date(a.dataset.fecha) - new Date(b.dataset.fecha);
            case 'fecha-desc':
                return new Date(b.dataset.fecha) - new Date(a.dataset.fecha);
            case 'prioridad':
                const prioridades = { 'alta': 3, 'media': 2, 'baja': 1 };
                return prioridades[b.dataset.prioridad] - prioridades[a.dataset.prioridad];
            case 'nombre':
                return a.querySelector('.task-title').textContent.localeCompare(
                    b.querySelector('.task-title').textContent
                );
            default:
                return 0;
        }
    });
    
    // Reordenar en el DOM
    tareaElements.forEach(tarea => container.appendChild(tarea));
}

// Cambiar vista
function cambiarVista(vista) {
    const container = document.getElementById('lista-tareas');
    const botones = document.querySelectorAll('.view-btn');
    
    // Actualizar clases
    botones.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-view="${vista}"]`).classList.add('active');
    
    // Aplicar vista
    if (vista === 'grid') {
        container.classList.add('grid-view');
        container.classList.remove('lista-view');
    } else {
        container.classList.remove('grid-view');
        container.classList.add('lista-view');
    }
}

// Funciones de ayuda
function mostrarAyuda() {
    notificarInfo('Funciones: Crear tareas, marcar como completadas, filtrar por estado, buscar, y más! 🚀', 5000);
}

function mostrarAcercaDe() {
    notificarInfo('Gestor de Tareas v2.0 - Desarrollado con amor ❤️', 4000);
}

// ============================================
// 📊 ESTADÍSTICAS DETALLADAS
// ============================================

// Mostrar modal de estadísticas detalladas
function mostrarEstadisticasDetalladas() {
    const modal = document.getElementById('estadisticas-modal');
    modal.style.display = 'flex';
    calcularEstadisticasDetalladas();
    notificarInfo('📊 Cargando estadísticas detalladas...', 2000);
}

// Ocultar modal de estadísticas detalladas
function ocultarEstadisticasDetalladas() {
    const modal = document.getElementById('estadisticas-modal');
    modal.style.display = 'none';
}

// Calcular y mostrar estadísticas detalladas
function calcularEstadisticasDetalladas() {
    const total = tareas.length;
    
    // Contadores básicos
    const completadas = tareas.filter(t => t.estado === 'completada' || t.completada).length;
    const proceso = tareas.filter(t => t.estado === 'proceso').length;
    const pendientes = tareas.filter(t => t.estado === 'pendiente' || (!t.completada && (!t.estado || t.estado === 'pendiente'))).length;
    
    // Estadísticas por prioridad
    const alta = tareas.filter(t => t.prioridad === 'alta').length;
    const media = tareas.filter(t => t.prioridad === 'media').length;
    const baja = tareas.filter(t => t.prioridad === 'baja').length;
    
    // Actualizar elementos básicos
    document.getElementById('stats-total').textContent = total;
    document.getElementById('stats-completadas').textContent = completadas;
    document.getElementById('stats-proceso').textContent = proceso;
    document.getElementById('stats-pendientes').textContent = pendientes;
    
    // Estadísticas de prioridad
    document.getElementById('stats-alta').textContent = alta;
    document.getElementById('stats-media').textContent = media;
    document.getElementById('stats-baja').textContent = baja;
    
    // Calcular porcentajes
    const altaPct = total > 0 ? Math.round((alta / total) * 100) : 0;
    const mediaPct = total > 0 ? Math.round((media / total) * 100) : 0;
    const bajaPct = total > 0 ? Math.round((baja / total) * 100) : 0;
    
    document.getElementById('stats-alta-pct').textContent = `${altaPct}%`;
    document.getElementById('stats-media-pct').textContent = `${mediaPct}%`;
    document.getElementById('stats-baja-pct').textContent = `${bajaPct}%`;
    
    // Tasa de completado
    const tasaCompletado = total > 0 ? Math.round((completadas / total) * 100) : 0;
    document.getElementById('tasa-completado').textContent = `${tasaCompletado}%`;
    
    // Actualizar círculo de progreso
    actualizarCirculoProgreso(tasaCompletado);
    
    // Calcular estadísticas de productividad
    calcularProductividad();
    
    // Generar actividad reciente
    generarActividadReciente();
}

// Actualizar círculo de progreso
function actualizarCirculoProgreso(porcentaje) {
    const circulo = document.getElementById('progreso-completado');
    const circumferencia = 2 * Math.PI * 45; // radio = 45
    const offset = circumferencia - (porcentaje / 100) * circumferencia;
    
    circulo.style.strokeDashoffset = offset;
}

// Calcular estadísticas de productividad
function calcularProductividad() {
    const ahora = new Date();
    const haceUnaSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Tareas de esta semana
    const tareasEstaSemana = tareas.filter(tarea => {
        const fechaTarea = new Date(tarea.fechaCreacion);
        return fechaTarea >= haceUnaSemana;
    }).length;
    
    // Promedio por día (últimos 7 días)
    const promedioPorDia = Math.round(tareasEstaSemana / 7 * 10) / 10;
    
    // Racha actual (días consecutivos con tareas completadas)
    const rachaActual = calcularRachaActual();
    
    document.getElementById('promedio-dia').textContent = promedioPorDia;
    document.getElementById('tareas-semana').textContent = tareasEstaSemana;
    document.getElementById('racha-actual').textContent = `${rachaActual} días`;
}

// Calcular racha actual
function calcularRachaActual() {
    const ahora = new Date();
    let racha = 0;
    
    for (let i = 0; i < 30; i++) {
        const fecha = new Date(ahora.getTime() - i * 24 * 60 * 60 * 1000);
        const fechaStr = fecha.toDateString();
        
        const tareasDelDia = tareas.filter(tarea => {
            const fechaTarea = new Date(tarea.fechaCompletada || tarea.fechaCreacion);
            return fechaTarea.toDateString() === fechaStr && (tarea.estado === 'completada' || tarea.completada);
        });
        
        if (tareasDelDia.length > 0) {
            racha++;
        } else if (i > 0) {
            break;
        }
    }
    
    return racha;
}

// Generar actividad reciente
function generarActividadReciente() {
    const container = document.getElementById('actividad-reciente');
    const actividades = [];
    
    // Obtener tareas recientes (últimas 5)
    const tareasRecientes = [...tareas]
        .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
        .slice(0, 5);
    
    tareasRecientes.forEach(tarea => {
        // Actividad de creación
        actividades.push({
            tipo: 'creacion',
            tarea: tarea,
            fecha: new Date(tarea.fechaCreacion),
            icono: 'fas fa-plus-circle',
            color: 'var(--primary-color)'
        });
        
        // Actividad de completado
        if (tarea.fechaCompletada) {
            actividades.push({
                tipo: 'completado',
                tarea: tarea,
                fecha: new Date(tarea.fechaCompletada),
                icono: 'fas fa-check-circle',
                color: 'var(--success-color)'
            });
        }
    });
    
    // Ordenar por fecha
    actividades.sort((a, b) => b.fecha - a.fecha);
    
    // Mostrar máximo 6 actividades
    const actividadesRecientes = actividades.slice(0, 6);
    
    if (actividadesRecientes.length === 0) {
        container.innerHTML = `
            <div class="timeline-item">
                <div class="timeline-icono">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="timeline-contenido">
                    <p>No hay actividad reciente</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = actividadesRecientes.map(actividad => `
        <div class="timeline-item">
            <div class="timeline-icono" style="background: ${actividad.color}">
                <i class="${actividad.icono}"></i>
            </div>
            <div class="timeline-contenido">
                <p>
                    <strong>${actividad.tipo === 'creacion' ? 'Creaste' : 'Completaste'}</strong> 
                    "${actividad.tarea.titulo}"
                </p>
                <div class="timeline-fecha">${formatearFecha(actividad.fecha)}</div>
            </div>
        </div>
    `).join('');
}

// Formatear fecha mejorado para la actividad
function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diferencia = ahora - fechaObj;
    
    // Si es hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaDia = new Date(fechaObj);
    fechaDia.setHours(0, 0, 0, 0);
    
    if (fechaDia.getTime() === hoy.getTime()) {
        return `Hoy a las ${fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Si fue ayer
    const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);
    if (fechaDia.getTime() === ayer.getTime()) {
        return `Ayer a las ${fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Si es esta semana
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    if (diferencia < 7 * 24 * 60 * 60 * 1000) {
        return `${diasSemana[fechaObj.getDay()]} a las ${fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Formato completo
    return fechaObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Event listeners para el modal de estadísticas
document.addEventListener('DOMContentLoaded', function() {
    // Cerrar modal al hacer clic en el botón cerrar
    const cerrarModal = document.getElementById('cerrar-estadisticas-modal');
    if (cerrarModal) {
        cerrarModal.addEventListener('click', ocultarEstadisticasDetalladas);
    }
    
    // Cerrar modal al hacer clic fuera de él
    const modal = document.getElementById('estadisticas-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                ocultarEstadisticasDetalladas();
            }
        });
    }
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('estadisticas-modal');
            if (modal && modal.style.display === 'flex') {
                ocultarEstadisticasDetalladas();
            }
        }
    });
});

// ============================================
// 📅 FUNCIONES DEL CALENDARIO
// ============================================

let fechaCalendarioActual = new Date();
let diaSeleccionado = null;

// Mostrar modal del calendario
function mostrarCalendario() {
    console.log('📅 Mostrando calendario...');
    
    const modal = document.getElementById('calendario-modal');
    if (!modal) {
        console.error('❌ Modal del calendario no encontrado');
        return;
    }
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Establecer fecha actual
    fechaCalendarioActual = new Date();
    actualizarCalendario();
}

// Ocultar modal del calendario
function ocultarCalendario() {
    const modal = document.getElementById('calendario-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        cerrarPanelDia();
    }, 300);
}

// Navegar entre meses
function navegarMes(direccion) {
    fechaCalendarioActual.setMonth(fechaCalendarioActual.getMonth() + direccion);
    actualizarCalendario();
}

// Actualizar el calendario
function actualizarCalendario() {
    console.log('🔄 Actualizando calendario...');
    console.log('📊 Total de tareas disponibles:', tareas.length);
    
    const mesActual = document.getElementById('mes-actual');
    const diasContainer = document.getElementById('calendario-dias');
    
    if (!mesActual || !diasContainer) {
        console.error('❌ Elementos del calendario no encontrados');
        return;
    }
    
    // Actualizar título del mes
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    mesActual.textContent = `${meses[fechaCalendarioActual.getMonth()]} ${fechaCalendarioActual.getFullYear()}`;
    
    // Limpiar días anteriores
    diasContainer.innerHTML = '';
    
    // Calcular primer día del mes y días en el mes
    const primerDia = new Date(fechaCalendarioActual.getFullYear(), fechaCalendarioActual.getMonth(), 1);
    const ultimoDia = new Date(fechaCalendarioActual.getFullYear(), fechaCalendarioActual.getMonth() + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();
    
    console.log(`📅 Generando calendario para ${meses[fechaCalendarioActual.getMonth()]} ${fechaCalendarioActual.getFullYear()}`);
    console.log(`📊 Días en el mes: ${diasEnMes}, Primer día de la semana: ${primerDiaSemana}`);
    
    // Agregar días del mes anterior para completar la primera semana
    const mesAnterior = new Date(fechaCalendarioActual.getFullYear(), fechaCalendarioActual.getMonth(), 0);
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
        const dia = mesAnterior.getDate() - i;
        const elemento = crearElementoDia(dia, true, new Date(mesAnterior.getFullYear(), mesAnterior.getMonth(), dia));
        diasContainer.appendChild(elemento);
    }
    
    // Agregar días del mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaDia = new Date(fechaCalendarioActual.getFullYear(), fechaCalendarioActual.getMonth(), dia);
        const elemento = crearElementoDia(dia, false, fechaDia);
        diasContainer.appendChild(elemento);
    }
    
    // Agregar días del siguiente mes para completar la última semana
    const diasRestantes = 42 - (primerDiaSemana + diasEnMes);
    for (let dia = 1; dia <= diasRestantes; dia++) {
        const fechaDia = new Date(fechaCalendarioActual.getFullYear(), fechaCalendarioActual.getMonth() + 1, dia);
        const elemento = crearElementoDia(dia, true, fechaDia);
        diasContainer.appendChild(elemento);
    }
    
    console.log('✅ Calendario actualizado correctamente');
}

// Crear elemento de día del calendario
function crearElementoDia(numeroDia, esOtroMes, fecha) {
    const hoy = new Date();
    const elemento = document.createElement('div');
    elemento.className = 'dia-calendario';
    
    if (esOtroMes) {
        elemento.classList.add('otro-mes');
    }
    
    // Marcar día actual
    if (fecha.toDateString() === hoy.toDateString()) {
        elemento.classList.add('hoy');
    }
    
    // Obtener tareas para este día
    const tareasDelDia = obtenerTareasDelDia(fecha);
    
    // Crear indicadores de tareas (máximo 5 para evitar overflow)
    const indicadoresTareas = tareasDelDia.slice(0, 5).map(tarea => {
        const estado = obtenerEstadoTarea(tarea, fecha);
        return `<div class="tarea-punto ${estado}" title="${tarea.titulo}"></div>`;
    }).join('');
    
    // Si hay más de 5 tareas, agregar indicador de "más"
    const masIndicador = tareasDelDia.length > 5 ? 
        `<div class="tarea-punto mas" title="+${tareasDelDia.length - 5} más">+${tareasDelDia.length - 5}</div>` : '';
    
    elemento.innerHTML = `
        <div class="dia-numero">${numeroDia}</div>
        <div class="tareas-indicador">
            ${indicadoresTareas}
            ${masIndicador}
        </div>
    `;
    
    // Agregar event listener para seleccionar día
    elemento.addEventListener('click', () => {
        if (!esOtroMes) {
            seleccionarDia(fecha, elemento);
        }
    });
    
    return elemento;
}

// Obtener tareas para un día específico
function obtenerTareasDelDia(fecha) {
    if (!tareas || tareas.length === 0) {
        return [];
    }
    
    const tareasDelDia = tareas.filter(tarea => {
        if (!tarea.fechaEntrega) return false;
        
        try {
            const fechaEntrega = new Date(tarea.fechaEntrega);
            const fechaComparar = new Date(fecha);
            
            // Comparar solo año, mes y día (ignorar hora)
            return fechaEntrega.getFullYear() === fechaComparar.getFullYear() &&
                   fechaEntrega.getMonth() === fechaComparar.getMonth() &&
                   fechaEntrega.getDate() === fechaComparar.getDate();
        } catch (error) {
            console.error('Error al comparar fechas:', error);
            return false;
        }
    });
    
    return tareasDelDia;
}

// Determinar el estado de una tarea para el calendario
function obtenerEstadoTarea(tarea, fecha) {
    const hoy = new Date();
    const fechaEntrega = new Date(tarea.fechaEntrega);
    
    if (tarea.estado === 'completada' || tarea.completada) {
        return 'completada';
    }
    
    if (fechaEntrega < hoy && tarea.estado !== 'completada') {
        return 'vencida';
    }
    
    if (tarea.estado === 'proceso') {
        return 'proceso';
    }
    
    return 'pendiente';
}

// Seleccionar un día del calendario
function seleccionarDia(fecha, elemento) {
    // Remover selección anterior
    document.querySelectorAll('.dia-calendario.activo').forEach(dia => {
        dia.classList.remove('activo');
    });
    
    // Agregar selección al día actual
    elemento.classList.add('activo');
    diaSeleccionado = fecha;
    
    // Mostrar panel de tareas del día
    mostrarTareasDelDia(fecha);
}

// Mostrar tareas del día seleccionado
function mostrarTareasDelDia(fecha) {
    const panel = document.getElementById('tareas-dia-panel');
    const fechaTexto = document.getElementById('fecha-texto');
    const tareasContainer = document.getElementById('tareas-del-dia');
    
    // Formatear fecha
    const opciones = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    fechaTexto.textContent = fecha.toLocaleDateString('es-ES', opciones);
    
    // Obtener tareas del día
    const tareasDelDia = obtenerTareasDelDia(fecha);
    
    if (tareasDelDia.length === 0) {
        tareasContainer.innerHTML = `
            <div class="empty-state-calendar">
                <i class="fas fa-calendar-check"></i>
                <p>No hay tareas programadas para este día</p>
            </div>
        `;
    } else {
        tareasContainer.innerHTML = tareasDelDia.map(tarea => {
            const estado = obtenerEstadoTarea(tarea, fecha);
            const iconoEstado = {
                'completada': 'fas fa-check-circle',
                'proceso': 'fas fa-spinner',
                'pendiente': 'fas fa-clock',
                'vencida': 'fas fa-exclamation-triangle'
            };
            
            return `
                <div class="tarea-calendario ${estado}">
                    <div class="tarea-calendario-titulo">
                        <i class="${iconoEstado[estado]}"></i>
                        ${tarea.titulo}
                    </div>
                    ${tarea.descripcion ? `
                        <div class="tarea-calendario-descripcion">${tarea.descripcion}</div>
                    ` : ''}
                    <div class="tarea-calendario-meta">
                        <span class="tarea-prioridad ${tarea.prioridad}">
                            ${tarea.prioridad === 'alta' ? '🔴' : tarea.prioridad === 'media' ? '🟡' : '🟢'} 
                            ${tarea.prioridad.charAt(0).toUpperCase() + tarea.prioridad.slice(1)}
                        </span>
                        <span class="tarea-estado-texto">
                            ${estado === 'completada' ? 'Completada' : 
                              estado === 'proceso' ? 'En Proceso' : 
                              estado === 'vencida' ? 'Vencida' : 'Pendiente'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Mostrar panel
    panel.style.display = 'block';
}

// Cerrar panel de tareas del día
function cerrarPanelDia() {
    const panel = document.getElementById('tareas-dia-panel');
    panel.style.display = 'none';
    
    // Remover selección de día
    document.querySelectorAll('.dia-calendario.activo').forEach(dia => {
        dia.classList.remove('activo');
    });
    
    diaSeleccionado = null;
}

// Event listeners para el calendario
document.addEventListener('DOMContentLoaded', () => {
    // Cerrar modal del calendario al hacer clic fuera
    const modalCalendario = document.getElementById('calendario-modal');
    if (modalCalendario) {
        modalCalendario.addEventListener('click', function(e) {
            if (e.target === modalCalendario) {
                ocultarCalendario();
            }
        });
    }
    
    // Cerrar modal del calendario con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('calendario-modal');
            if (modal && modal.classList.contains('show')) {
                ocultarCalendario();
            }
        }
    });
});