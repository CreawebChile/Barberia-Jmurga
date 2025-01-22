import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

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

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        // Mostrar indicador de carga
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verificar si el usuario es admin
        const adminQuery = query(
            collection(db, "users"),
            where("uid", "==", user.uid),
            where("role", "==", "admin")
        );

        const querySnapshot = await getDocs(adminQuery);
        
        if (querySnapshot.empty) {
            await auth.signOut();
            alert('No tienes permisos de administrador');
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            return;
        }

        // Guardar estado de autenticación admin en sessionStorage
        sessionStorage.setItem('isAdmin', 'true');
        
        // Redirigir al panel de admin
        window.location.replace('admin.html');
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        alert('Error al iniciar sesión: ' + error.message);
        
        // Restaurar botón
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
});

// Verificar si ya hay una sesión activa de admin
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const adminQuery = query(
            collection(db, "users"),
            where("uid", "==", user.uid),
            where("role", "==", "admin")
        );

        const querySnapshot = await getDocs(adminQuery);
        if (!querySnapshot.empty) {
            window.location.replace('admin.html');
        }
    }
});
