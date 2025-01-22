import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, onSnapshot, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJsFwacAp4pjmRaBDN1ceL_LOoqvqjYVA",
    authDomain: "barberia-ljmurga.firebaseapp.com",
    projectId: "barberia-ljmurga",
    storageBucket: "barberia-ljmurga.firebasestorage.app",
    messagingSenderId: "936526650953",
    appId: "1:936526650953:web:f3c1eab09b7d855743a998"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Verificar si es admin
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'admin-login.html'; // Cambiar a la página de login de admin
        return;
    }

    try {
        const userDoc = await getDocs(query(
            collection(db, "users"),
            where("uid", "==", user.uid),
            where("role", "==", "admin")
        ));

        if (userDoc.empty) {
            await signOut(auth);
            window.location.href = 'admin-login.html';
            return;
        }

        document.getElementById('adminName').textContent = user.email;
        initializeRealtimeAppointments(); // Iniciar observador en tiempo real
    } catch (error) {
        console.error("Error verificando permisos:", error);
        window.location.href = 'admin-login.html';
    }
});

// Agregar sonido de notificación
const notificationSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

// Actualizar la función initializeRealtimeAppointments para mejor manejo en tiempo real
function initializeRealtimeAppointments() {
    const pendingQuery = query(
        collection(db, "appointments"),
        where("status", "==", "pending")
    );

    const confirmedQuery = query(
        collection(db, "appointments"),
        where("status", "==", "confirmed")
    );

    let firstLoadPending = false; // Cambiado a false para asegurar la limpieza inicial
    let firstLoadConfirmed = true;

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
        const appointmentsContainer = document.getElementById('pendingAppointments');
        if (!appointmentsContainer) return;

        if (firstLoadPending) {
            appointmentsContainer.innerHTML = '';
        }

        // Ordenar citas por timestamp
        const appointments = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => b.timestamp - a.timestamp);

        // Procesar cada cita
        appointments.forEach(appointment => {
            const existingCard = document.querySelector(`[data-appointment-id="${appointment.id}"]`);
            if (!existingCard) {
                const card = createAppointmentCard(appointment.id, appointment);
                appointmentsContainer.insertBefore(card, appointmentsContainer.firstChild);
            }
        });

        // Verificar si no hay citas
        if (appointmentsContainer.children.length === 0) {
            appointmentsContainer.innerHTML = `
                <div class="no-appointments">
                    <i class="fas fa-calendar-check"></i>
                    <p>No hay citas pendientes</p>
                </div>
            `;
        }

        firstLoadPending = true;
    }, (error) => {
        console.error("Error en el listener de citas pendientes:", error);
    });

    // Manejar citas confirmadas
    const unsubscribeConfirmed = onSnapshot(confirmedQuery, (snapshot) => {
        const confirmedContainer = document.getElementById('confirmedAppointments');
        if (!confirmedContainer) return;

        const appointments = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (appointments.length === 0) {
            confirmedContainer.innerHTML = `
                <div class="no-appointments">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay horas confirmadas</p>
                </div>
            `;
            return;
        }

        confirmedContainer.innerHTML = '';
        appointments.forEach(appointment => {
            const card = createConfirmedAppointmentCard(appointment);
            confirmedContainer.appendChild(card);
        });
    });

    // Limpiar listeners al cerrar
    window.addEventListener('unload', () => {
        unsubscribePending();
        unsubscribeConfirmed();
    });
}

// Manejar citas pendientes
function handlePendingSnapshot(snapshot) {
    const appointmentsContainer = document.getElementById('pendingAppointments');
    if (!appointmentsContainer) return;

    // Limpiar el contenedor si es la primera carga
    if (firstLoadPending) {
        appointmentsContainer.innerHTML = '';
    }

    // Procesar cambios
    snapshot.docChanges().forEach((change) => {
        const appointment = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === "added") {
            // Nueva cita
            if (!firstLoadPending) {
                notificationSound.play().catch(e => console.log('Error al reproducir sonido:', e));
                showNotification(appointment);
            }
            const card = createAppointmentCard(appointment.id, appointment);
            appointmentsContainer.insertBefore(card, appointmentsContainer.firstChild);
        } 
        else if (change.type === "modified") {
            // Actualización de cita
            const existingCard = document.querySelector(`[data-appointment-id="${change.doc.id}"]`);
            if (existingCard && appointment.status === "pending") {
                const newCard = createAppointmentCard(appointment.id, appointment);
                existingCard.replaceWith(newCard);
            } else if (existingCard) {
                existingCard.remove();
            }
        } 
        else if (change.type === "removed") {
            // Eliminación de cita
            const existingCard = document.querySelector(`[data-appointment-id="${change.doc.id}"]`);
            if (existingCard) {
                existingCard.remove();
            }
        }
    });

    // Verificar si no hay citas después de los cambios
    if (appointmentsContainer.children.length === 0) {
        appointmentsContainer.innerHTML = `
            <div class="no-appointments">
                <i class="fas fa-calendar-check"></i>
                <p>No hay citas pendientes</p>
            </div>
        `;
    }

    firstLoadPending = false;
}

// Manejar citas confirmadas
function handleConfirmedSnapshot(snapshot) {
    const confirmedContainer = document.getElementById('confirmedAppointments');
    if (!confirmedContainer) return;

    const appointments = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (appointments.length === 0) {
        confirmedContainer.innerHTML = `
            <div class="no-appointments">
                <i class="fas fa-check-circle"></i>
                <p>No hay horas confirmadas</p>
        `;
        return;
    }

    confirmedContainer.innerHTML = '';
    appointments.forEach(appointment => {
        const card = createConfirmedAppointmentCard(appointment);
        confirmedContainer.appendChild(card);
    });
}

// Crear tarjeta para citas confirmadas
function createConfirmedAppointmentCard(appointment) {
    const card = document.createElement('div');
    card.className = 'appointment-card confirmed';
    card.setAttribute('data-appointment-id', appointment.id);
    
    // Formatear fecha y hora
    const fecha = new Date(appointment.date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Limpiar y formatear el número de teléfono
    const phoneNumber = appointment.userPhone ? appointment.userPhone.replace(/^\+?56/, '') : 'No disponible';
    
    // Crear enlace de WhatsApp
    const whatsappMessage = encodeURIComponent(
        `Hola ${appointment.userName}, recordatorio de tu cita en Barbería LJMurga para el ${fecha} a las ${appointment.time}`
    );
    const whatsappLink = phoneNumber !== 'No disponible' 
        ? `https://wa.me/56${phoneNumber}?text=${whatsappMessage}`
        : '#';

    card.innerHTML = `
        <div class="appointment-header">
            <span class="appointment-status">
                <i class="fas fa-check-circle"></i> Confirmada
            </span>
            <span class="appointment-time">
                <i class="far fa-clock"></i> ${appointment.time}
            </span>
        </div>
        <div class="appointment-details">
            <div class="client-info">
                <h3><i class="fas fa-user"></i> ${appointment.userName}</h3>
                <p><i class="fas fa-envelope"></i> ${appointment.userEmail}</p>
                ${phoneNumber !== 'No disponible' ? `
                    <p><i class="fab fa-whatsapp"></i> 
                        <a href="${whatsappLink}" target="_blank" class="whatsapp-link">
                            +56 ${phoneNumber}
                        </a>
                    </p>` : ''
                }
            </div>
            <div class="service-info">
                <p><i class="fas fa-cut"></i> ${appointment.serviceName}</p>
                <p><i class="fas fa-dollar-sign"></i> $${appointment.price}</p>
                <p><i class="fas fa-calendar-check"></i> ${fecha}</p>
            </div>
        </div>
        <div class="appointment-actions">
            ${phoneNumber !== 'No disponible' ? `
                <button onclick="window.open('${whatsappLink}', '_blank')" class="btn btn-whatsapp">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
            ` : ''}
            <button onclick="markAsCompleted('${appointment.id}')" class="btn btn-success">
                <i class="fas fa-check-double"></i> Realizado
            </button>
        </div>
    `;

    return card;
}

// Función mejorada para manejar notificaciones
async function initializeNotifications() {
    try {
        // Verificar si el navegador soporta notificaciones
        if (!('Notification' in window)) {
            console.log('Este navegador no soporta notificaciones.');
            return false;
        }

        // Verificar el estado actual de los permisos
        if (Notification.permission === 'granted') {
            return true;
        } else if (Notification.permission === 'denied') {
            console.log('Las notificaciones están bloqueadas. Por favor, habilítalas en la configuración del navegador.');
            showNotificationInstructions();
            return false;
        }

        // Solicitar permisos solo si no están denied
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.log('Error al inicializar notificaciones:', error);
        return false;
    }
}

// Función para mostrar instrucciones de activación de notificaciones
function showNotificationInstructions() {
    const appointmentsContainer = document.getElementById('pendingAppointments');
    const instructionsDiv = document.createElement('div');
    instructionsDiv.className = 'notification-instructions';
    instructionsDiv.innerHTML = `
        <div class="alert alert-warning">
            <i class="fas fa-bell"></i>
            <p>Las notificaciones están desactivadas. Para activarlas:</p>
            <ol>
                <li>Haz clic en el icono de información junto a la URL</li>
                <li>Busca la configuración de "Notificaciones"</li>
                <li>Selecciona "Permitir"</li>
            </ol>
        </div>
    `;
    appointmentsContainer.insertBefore(instructionsDiv, appointmentsContainer.firstChild);
}

// Actualizar la función showNotification
function showNotification(appointment) {
    if (Notification.permission === 'granted') {
        try {
            new Notification('Nueva Reserva', {
                body: `Nueva reserva de ${appointment.userName} para ${appointment.time}`,
                icon: '/favicon.ico', // Asegúrate de tener un favicon
                tag: 'new-appointment',
                requireInteraction: true
            });
            notificationSound.play().catch(e => console.log('Error al reproducir sonido:', e));
        } catch (error) {
            console.log('Error al mostrar notificación:', error);
        }
    }
}

// Solicitar permisos de notificación al cargar
document.addEventListener('DOMContentLoaded', async () => {
    await initializeNotifications();
    setupNavigation();
});

// Crear tarjeta de reserva
function createAppointmentCard(id, appointment) {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    card.setAttribute('data-appointment-id', id); // Agregar el ID como atributo de datos
    
    // Formatear fecha y hora
    const fecha = new Date(appointment.date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Limpiar y formatear el número de teléfono
    const phoneNumber = appointment.userPhone ? appointment.userPhone.replace(/^\+?56/, '') : 'No disponible';
    
    // Crear enlace de WhatsApp solo si hay número de teléfono
    const whatsappMessage = encodeURIComponent(
        `Hola ${appointment.userName}, sobre tu cita en Barbería LJMurga para el ${fecha} a las ${appointment.time}`
    );
    const whatsappLink = phoneNumber !== 'No disponible' 
        ? `https://wa.me/56${phoneNumber}?text=${whatsappMessage}`
        : '#';

    // Modificar el HTML de la tarjeta para manejar casos sin teléfono
    const whatsappSection = phoneNumber !== 'No disponible'
        ? `<p><i class="fab fa-whatsapp"></i> 
            <a href="${whatsappLink}" target="_blank" class="whatsapp-link">
                +56 ${phoneNumber}
            </a>
          </p>`
        : `<p><i class="fas fa-phone"></i> No disponible</p>`;

    card.innerHTML = `
        <div class="appointment-header">
            <span class="appointment-date">
                <i class="far fa-calendar"></i> ${fecha}
            </span>
            <span class="appointment-time">
                <i class="far fa-clock"></i> ${appointment.time}
            </span>
        </div>
        <div class="appointment-details">
            <div class="client-info">
                <h3><i class="fas fa-user"></i> ${appointment.userName}</h3>
                <p><i class="fas fa-envelope"></i> ${appointment.userEmail}</p>
                ${whatsappSection}
            </div>
            <div class="service-info">
                <p><i class="fas fa-cut"></i> ${appointment.serviceName}</p>
                <p><i class="fas fa-clock"></i> Duración: ${appointment.duration} minutos</p>
                <p><i class="fas fa-dollar-sign"></i> Precio: $${appointment.price}</p>
            </div>
        </div>
        <div class="appointment-actions">
            ${phoneNumber !== 'No disponible' ? `
                <button onclick="window.open('${whatsappLink}', '_blank')" class="btn btn-whatsapp">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
            ` : ''}
            <button onclick="confirmAppointment('${id}')" class="btn btn-success">
                <i class="fas fa-check"></i> Confirmar
            </button>
            <button onclick="cancelAppointment('${id}')" class="btn btn-danger">
                <i class="fas fa-times"></i> Cancelar
            </button>
        </div>
    `;
    
    // Agregar notificación para citas nuevas
    if (isNewAppointment(appointment.createdAt)) {
        card.classList.add('new-appointment');
    }

    return card;
}

// Actualizar función isNewAppointment para usar timestamp
function isNewAppointment(createdAt) {
    const appointmentTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const fiveMinutes = 5 * 60 * 1000;
    return (now - appointmentTime) < fiveMinutes;
}

// Confirmar reserva
window.confirmAppointment = async (appointmentId) => {
    try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        await updateDoc(appointmentRef, {
            status: "confirmed",
            confirmedAt: new Date().toISOString(),
            lastUpdate: Date.now()
        });
        // No necesitamos recargar manualmente ya que el listener se encargará de actualizar la UI
    } catch (error) {
        console.error("Error confirmando cita:", error);
        alert("Error al confirmar la cita. Por favor intente nuevamente.");
    }
};

// Agregar función para marcar como realizado
window.markAsCompleted = async (appointmentId) => {
    if (!confirm('¿Confirmar que el servicio fue realizado?')) return;

    try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        await updateDoc(appointmentRef, {
            status: "completed",
            completedAt: new Date().toISOString(),
            lastUpdate: Date.now()
        });

        // La cita se eliminará automáticamente de la vista de confirmadas
        // gracias al listener en tiempo real
    } catch (error) {
        console.error("Error al marcar como realizado:", error);
        alert("Error al actualizar el estado. Por favor intente nuevamente.");
    }
};

// Actualizar función de cancelación
window.cancelAppointment = async (appointmentId) => {
    try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        const appointmentDoc = await getDoc(appointmentRef);
        const appointment = appointmentDoc.data();

        // Formatear la fecha para el mensaje
        const fecha = new Date(appointment.date).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Personalizar mensaje según si hay teléfono o no
        if (appointment.userPhone) {
            const whatsappMessage = encodeURIComponent(
                `Hola ${appointment.userName}, te escribo desde Barbería LJMurga.\n\n` +
                `Lamentablemente debemos cancelar tu cita programada para:\n` +
                `📅 Fecha: ${fecha}\n` +
                `⏰ Hora: ${appointment.time}\n\n` +
                `Por favor, ingresa a nuestro sitio web para agendar una nueva cita en otro horario disponible.\n\n` +
                `Disculpa las molestias ocasionadas.`
            );
            
            const whatsappLink = `https://wa.me/56${appointment.userPhone.replace(/^\+?56/, '')}?text=${whatsappMessage}`;
            
            // Primero abrir WhatsApp y esperar confirmación del admin
            window.open(whatsappLink, '_blank');
            
            // Solo cancelar si el admin confirma después de enviar el mensaje
            if (confirm('¿Confirmas que ya notificaste al cliente y deseas cancelar la cita?')) {
                await updateDoc(appointmentRef, {
                    status: "cancelled",
                    cancelledAt: new Date().toISOString(),
                    lastUpdate: Date.now(),
                    cancellationReason: "Cancelado por el administrador"
                });
                alert("Cita cancelada exitosamente");
            }
        } else {
            // Si no hay teléfono, mostrar advertencia
            if (confirm(`Este cliente no tiene teléfono registrado. ¿Deseas cancelar la cita de todas formas?\n\nCliente: ${appointment.userName}\nFecha: ${fecha}\nHora: ${appointment.time}`)) {
                await updateDoc(appointmentRef, {
                    status: "cancelled",
                    cancelledAt: new Date().toISOString(),
                    lastUpdate: Date.now(),
                    cancellationReason: "Cancelado por el administrador - Sin notificación"
                });
                alert("Cita cancelada exitosamente. Recuerda notificar al cliente por correo electrónico.");
            }
        }
    } catch (error) {
        console.error("Error cancelando cita:", error);
        alert("Error al cancelar la cita. Por favor intente nuevamente.");
    }
};

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// Agregar manejadores para la navegación
document.addEventListener('DOMContentLoaded', async () => {
    await initializeNotifications();
    setupNavigation();
});

function setupNavigation() {
    const navLinks = document.querySelectorAll('.admin-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('href').substring(1);
            showSection(sectionId);
            updateActiveLink(link);
        });
    });
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('main section');
    sections.forEach(section => {
        section.style.display = section.id === sectionId ? 'block' : 'none';
    });

    if (sectionId === 'clientes') {
        loadClients();
    }
}

function updateActiveLink(activeLink) {
    document.querySelectorAll('.admin-nav a').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

// Función para cargar y mostrar clientes
async function loadClients() {
    const clientsContainer = document.getElementById('registeredClients');
    if (!clientsContainer) return;

    try {
        // Simplificar la consulta temporalmente sin orderBy
        const querySnapshot = await getDocs(
            query(
                collection(db, "users"),
                where("role", "==", "client")
            )
        );

        if (querySnapshot.empty) {
            clientsContainer.innerHTML = `
                <div class="no-clients">
                    <i class="fas fa-users"></i>
                    <p>No hay clientes registrados</p>
                </div>
            `;
            return;
        }

        // Obtener y ordenar los clientes manualmente
        const clients = querySnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        clientsContainer.innerHTML = '';
        clients.forEach(client => {
            const card = createClientCard(client);
            clientsContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Error cargando clientes:", error);
        clientsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error al cargar los clientes. Detalles: ${error.message}</p>
            </div>
        `;
    }
}

function createClientCard(client) {
    const card = document.createElement('div');
    card.className = 'client-card';
    
    // Asegurarse de que todos los campos existan
    const name = client.name || 'Sin nombre';
    const email = client.email || 'Sin correo';
    const phone = client.phone ? client.phone.replace(/^\+?56/, '') : '';
    const createdAt = client.createdAt || null;
    const lastLogin = client.lastLogin || null;
    
    card.innerHTML = `
        <div class="client-header">
            <i class="fas fa-user-circle"></i>
            <div class="client-info">
                <h3>${name}</h3>
                <p><i class="fas fa-envelope"></i> ${email}</p>
                ${phone ? `<p><i class="fas fa-phone"></i> +56 ${phone}</p>` : ''}
            </div>
        </div>
        <div class="client-stats">
            <p><i class="fas fa-clock"></i> Registrado: ${formatDate(createdAt)}</p>
            ${lastLogin ? `<p><i class="fas fa-sign-in-alt"></i> Último acceso: ${formatDate(lastLogin)}</p>` : ''}
        </div>
    `;

    return card;
}

// Mejorar la función formatDate para manejar diferentes formatos de fecha
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
        const date = timestamp instanceof Date ? timestamp : 
                     typeof timestamp === 'string' ? new Date(timestamp) :
                     new Date(timestamp);

        if (isNaN(date.getTime())) return 'Fecha inválida';

        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return 'Error en fecha';
    }
}

