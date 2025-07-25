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

    try {
        if (tareaEditandoId) {
            // Estamos editando una tarea existente
            const response = await realizarPeticion(`${API_CONFIG.ENDPOINTS.TAREAS}/${tareaEditandoId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    titulo,
                    descripcion,
                    prioridad
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
                prioridad
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
            notificarExito('¡Bienvenido al Gestor de Tareas mejorado! 🚀✨', 4000);
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

// Cambiar tema
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    }
}

// Cargar tema guardado
function cargarTema() {
    const theme = localStorage.getItem('theme');
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        icon.className = 'fas fa-sun';
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