import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJsFwacAp4pjmRaBDN1ceL_LOoqvqjYVA",
    authDomain: "barberia-ljmurga.firebaseapp.com",
    projectId: "barberia-ljmurga",
    storageBucket: "barberia-ljmurga.firebasestorage.app",
    messagingSenderId: "936526650953",
    appId: "1:936526650953:web:f3c1eab09b7d855743a998"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let currentUser = null;

// Auth state observer
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        document.querySelectorAll('.auth-dependent').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.auth-dependent').forEach(el => el.style.display = 'none');
    }
});

// Auth modal elements
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authTabs = document.querySelectorAll('.tab-btn');
const closeAuth = document.getElementById('closeAuth');

// Tab switching
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (tab.dataset.tab === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    });
});

// Update login form handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        alert('Error al iniciar sesión: ' + error.message);
    }
});

// Update register form handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;

    // Validar formato del teléfono (solo los 9 dígitos después del +56)
    if (!phone.match(/^9[0-9]{8}$/)) {
        alert('El número debe comenzar con 9 y tener 9 dígitos.\nEjemplo: 912345678');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        await setDoc(doc(db, "users", uid), {
            uid: uid,
            name: name,
            email: email,
            phone: '+56' + phone, // El prefijo +56 se agrega automáticamente
            createdAt: new Date().toISOString(),
            role: 'client'
        });

        window.location.href = 'dashboard.html';
    } catch (error) {
        alert('Error al registrarse: ' + error.message);
    }
});

// Update CTA button click handler
const ctaButton = document.querySelector(".cta-button");
ctaButton.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthModal(); // Always show auth modal first
});

// Modal functionality with null checks
const modal = document.getElementById("appointmentModal");
const closeBtn = document.querySelector(".close");
const appointmentForm = document.getElementById("appointmentForm");

if (closeBtn) {
    closeBtn.addEventListener("click", () => {
        if (modal) modal.style.display = "none";
    });
}

if (modal) {
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}

if (appointmentForm) {
    appointmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
    
        if (!currentUser) {
            alert('Debes iniciar sesión para agendar una cita');
            return;
        }
        
        const appointmentData = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            date: document.getElementById("date").value,
            time: document.getElementById("time").value,
            service: document.getElementById("service").value,
            createdAt: new Date().toISOString()
        };
    
        try {
            await addDoc(collection(db, "appointments"), appointmentData);
            alert("Cita agendada exitosamente!");
            appointmentForm.reset();
            modal.style.display = "none";
        } catch (error) {
            console.error("Error al agendar la cita: ", error);
            alert("Error al agendar la cita. Por favor intente nuevamente.");
        }
    });
}

// Close modals
closeAuth.addEventListener('click', () => {
    authModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.style.display = 'none';
    } else if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Burger menu functionality
const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav-links');
const navLinks = document.querySelectorAll('.nav-links li');

burger.addEventListener('click', () => {
    nav.classList.toggle('active');
    
    navLinks.forEach((link, index) => {
        if(link.style.animation) {
            link.style.animation = '';
        } else {
            link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
        }
    });

    burger.classList.toggle('toggle');
});

// Cerrar menú al hacer click en un enlace
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        nav.classList.remove('active');
        burger.classList.remove('toggle');
    });
});

// Show/Hide modal functions
function showAuthModal() {
    authModal.style.display = "block";
    modal.style.display = "none";
}

function showAppointmentModal() {
    modal.style.display = "block";
    authModal.style.display = "none";
}
