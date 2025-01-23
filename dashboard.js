import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
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

// Constantes para el horario
const BUSINESS_HOURS = {
    start: 12,        // 12:00
    end: 17,         // 17:00
    duration: 40,    // duración en minutos
    lastAppointment: "16:20", // última cita posible (17:00 - 40min)
    servicePrice: 5000,
    serviceName: "Corte de Cabello"
};

// Auth state observer with user data
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Redirigir a login si no hay usuario autenticado
        window.location.href = 'login.html';
        return;
    } else {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const userName = userData.name;
                
                // Actualizar elementos con verificación de existencia
                const updateElement = (id, value) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = value;
                    }
                };

                updateElement('userName', userName);
                updateElement('sidebarUserName', userName);
                updateElement('userEmail', userData.email);
                updateElement('sidebarUserEmail', userData.email);
            }
        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
        }
    }
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// Calendar functionality
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;

// Actualizar la función renderCalendar para manejar mejor las fechas
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;

    const currentMonthElement = document.getElementById('currentMonth');
    if (!currentMonthElement) return;
    
    calendar.innerHTML = '';
    currentMonthElement.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.textContent = day;
        dayHeader.classList.add('calendar-day', 'header');
        calendar.appendChild(dayHeader);
    });

    const now = new Date();
    // Establecer la hora actual
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar-day', 'disabled');
        calendar.appendChild(emptyDay);
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        dayElement.classList.add('calendar-day');
        
        // Deshabilitar días pasados y domingos
        const isSameDay = dateToCheck.toDateString() === now.toDateString();
        const isPastDay = dateToCheck < now && !isSameDay;
        
        if (isPastDay || dateToCheck.getDay() === 0) {
            dayElement.classList.add('disabled');
            dayElement.title = dateToCheck.getDay() === 0 ? 'No atendemos los domingos' : 'Fecha pasada';
        } else {
            dayElement.addEventListener('click', () => selectDate(dateToCheck));
        }
        
        calendar.appendChild(dayElement);
    }
}

// Event Listeners para navegación del calendario
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();

    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
});

// Actualizar función para seleccionar fecha
function selectDate(date) {
    selectedDate = date;
    const selectedDateElement = document.getElementById('selectedDate');
    if (selectedDateElement) {
        selectedDateElement.textContent = date.toLocaleDateString();
    }
    
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    renderTimeSlots();
}

// Actualizar renderTimeSlots para manejar horas en tiempo real
async function renderTimeSlots() {
    const timeSlotsElement = document.getElementById('timeSlots');
    if (!timeSlotsElement) return;
    
    timeSlotsElement.innerHTML = '';
    const slots = generateTimeSlots();
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    for (const time of slots) {
        const slot = document.createElement('div');
        slot.textContent = time;
        slot.classList.add('time-slot');
        
        const [hours, minutes] = time.split(':').map(Number);
        const slotTime = hours * 60 + minutes;
        const currentTime = currentHour * 60 + currentMinute;
        
        // Verificar si el horario está dentro del rango de trabajo y no ha pasado
        const isWithinBusinessHours = (hours >= BUSINESS_HOURS.start && 
            (hours < BUSINESS_HOURS.end || (hours === BUSINESS_HOURS.end && minutes === 0)));
        
        // Para el día actual, deshabilitar horas que ya pasaron o están a menos de 1 hora
        const isPastTime = isToday && (slotTime <= currentTime + 60);
        
        if (isWithinBusinessHours && !isPastTime) {
            const isAvailable = await checkTimeSlotAvailability(selectedDate, time);
            if (isAvailable) {
                slot.addEventListener('click', () => selectTime(time));
            } else {
                slot.classList.add('disabled');
                slot.title = 'Horario no disponible';
            }
        } else {
            slot.classList.add('disabled');
            slot.title = isPastTime ? 'Hora pasada o muy próxima' : 'Fuera del horario de atención';
        }
        
        timeSlotsElement.appendChild(slot);
    }
}

function selectTime(time) {
    selectedTime = time;
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    event.target.classList.add('selected');
    document.getElementById('selectedTime').textContent = time;
}

function generateTimeSlots() {
    const slots = [];
    // Generar slots con intervalos exactos de 40 minutos
    for (let hour = BUSINESS_HOURS.start; hour <= BUSINESS_HOURS.end; hour++) {
        for (let minute = 0; minute < 60; minute += 40) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            if (timeString <= BUSINESS_HOURS.lastAppointment) {
                slots.push(timeString);
            }
        }
    }
    return slots;
}

// Handle appointment form submission
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Disable submit button to prevent double submission
        const submitButton = bookingForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        try {
            // Validate date and time
            if (!selectedDate || !selectedTime) {
                throw new Error('Fecha y hora son requeridos');
            }

            // Get and validate current user
            const user = auth.currentUser;
            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            // Get user data with validation
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                throw new Error('Datos de usuario no encontrados');
            }

            const userData = userDoc.data();
            if (!userData?.email) {
                throw new Error('Datos de usuario incompletos');
            }

            // Validate availability again before submitting
            const isAvailable = await checkTimeSlotAvailability(selectedDate, selectedTime);
            if (!isAvailable) {
                throw new Error('El horario ya no está disponible');
            }

            const now = new Date();
            const appointmentData = {
                userId: user.uid,
                userName: userData?.name || user.displayName || 'Usuario sin nombre',
                userEmail: userData?.email || user.email,
                userPhone: userData?.phone || null,
                service: "corte",
                serviceName: BUSINESS_HOURS.serviceName,
                price: BUSINESS_HOURS.servicePrice,
                date: selectedDate.toISOString(),
                time: selectedTime,
                duration: BUSINESS_HOURS.duration,
                status: 'pending',
                createdAt: now.toISOString(),
                timestamp: now.getTime(),
                lastUpdate: now.getTime()
            };

            // Add appointment to Firestore
            const docRef = await addDoc(collection(db, "appointments"), appointmentData);
            
            if (!docRef.id) {
                throw new Error('Error al crear la cita');
            }

            alert("¡Cita agendada exitosamente!");
            
            // Reset form
            selectedDate = null;
            selectedTime = null;
            document.getElementById('selectedDate').textContent = '-';
            document.getElementById('selectedTime').textContent = '-';
            renderCalendar();
            
        } catch (error) {
            console.error("Error detallado:", error);
            alert(error.message || "Error al agendar la cita. Por favor intente nuevamente.");
        } finally {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-check"></i> Confirmar Reserva';
        }
    });
}

// Actualizar la función checkTimeSlotAvailability
async function checkTimeSlotAvailability(date, time) {
    try {
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        const appointmentTime = hours * 60 + minutes;
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const isToday = date.toDateString() === now.toDateString();

        // Si es hoy y la hora ya pasó o está a menos de 1 hora
        if (isToday && appointmentTime <= currentTime + 60) {
            return false;
        }

        const startTime = BUSINESS_HOURS.start * 60;
        const endTime = (BUSINESS_HOURS.end * 60) - BUSINESS_HOURS.duration; // Última cita posible

        // Verificar si está dentro del horario de atención
        if (appointmentTime < startTime || appointmentTime > endTime) {
            return false;
        }

        // Verificar si hay citas que se solapan
        const appointmentEndTime = appointmentTime + BUSINESS_HOURS.duration;
        const appointments = await getDocs(
            query(
                collection(db, "appointments"),
                where("date", "==", date.toISOString()),
                where("status", "in", ["pending", "confirmed"]) // Solo verificar citas pendientes y confirmadas
            )
        );

        // Verificar solapamiento con otras citas
        for (const doc of appointments.docs) {
            const existingAppointment = doc.data();
            const [existingHours, existingMinutes] = existingAppointment.time.split(':').map(Number);
            const existingStart = existingHours * 60 + existingMinutes;
            const existingEnd = existingStart + BUSINESS_HOURS.duration;

            // Si hay solapamiento con una cita pendiente o confirmada, el horario no está disponible
            if (
                (appointmentTime >= existingStart && appointmentTime < existingEnd) ||
                (appointmentEndTime > existingStart && appointmentEndTime <= existingEnd)
            ) {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error("Error verificando disponibilidad:", error);
        return false;
    }
}
