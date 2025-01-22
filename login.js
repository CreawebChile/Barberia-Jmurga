import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBJsFwacAp4pjmRaBDN1ceL_LOoqvqjYVA",
    authDomain: "barberia-ljmurga.firebaseapp.com",
    projectId: "barberia-ljmurga",
    storageBucket: "barberia-ljmurga.firebasestorage.app",
    messagingSenderId: "936526650953",
    appId: "1:936526650953:web:f3c1eab09b7d855743a998"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Cambiar entre formularios
const tabBtns = document.querySelectorAll('.tab-btn');
const forms = document.querySelectorAll('.auth-form');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Actualizar botones
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Mostrar formulario correspondiente
        forms.forEach(form => {
            form.classList.add('hidden');
            if (form.id === `${tabName}Form`) {
                form.classList.remove('hidden');
            }
        });
    });
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert('Error al iniciar sesión: ' + error.message);
    }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;

    // Validar formato del teléfono
    if (!phone.match(/^9[0-9]{8}$/)) {
        alert('El número debe comenzar con 9 y tener 9 dígitos.\nEjemplo: 912345678');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            name: name,
            email: email,
            phone: '+56' + phone, // Agregamos el prefijo al guardar
            role: "client",
            createdAt: new Date().toISOString()
        });
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert('Error al registrarse: ' + error.message);
    }
});

// Verificar estado de autenticación
auth.onAuthStateChanged((user) => {
    if (user) {
        window.location.href = 'dashboard.html';
    }
});
