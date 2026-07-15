const BASE_URL = 'http://localhost:3000';

function toggleAuth() {
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');
    
    if (loginCard.style.display === 'none') {
        loginCard.style.display = 'block';
        registerCard.style.display = 'none';
    } else {
        loginCard.style.display = 'none';
        registerCard.style.display = 'block';
    }
}

// --------------------------------------------------------
// LÓGICA DE LOGIN
// --------------------------------------------------------
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const btn = e.target.querySelector('button');

    const originalText = btn.innerText;
    btn.innerText = "Verificando...";
    btn.disabled = true;

    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('role', data.user.role);
            localStorage.setItem('userId', data.user.id); 
            
            window.location.href = 'menu.html';
        } else {
            alert("⚠️ " + (data.message || "Credenciales incorrectas"));
        }

    } catch (error) {
        console.error("Error en login:", error);
        alert("❌ Error de conexión: Asegúrate de que el servidor esté corriendo.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// --------------------------------------------------------
// LÓGICA DE REGISTRO
// --------------------------------------------------------
const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. CAPTURAMOS LOS VALORES (Aquí estaba el detalle)
        const name = document.getElementById('reg-name')?.value || "";
        const username = document.getElementById('reg-user').value;
        const email = document.getElementById('reg-email')?.value || "";
        const phone = document.getElementById('reg-phone')?.value || "";
        const password = document.getElementById('reg-pass').value;
        
        // --- NUEVOS CAMPOS ---
        const address = document.getElementById('reg-address')?.value || "";
        const role = document.getElementById('reg-role')?.value || "user";

        if (password.length < 4) {
            alert("La contraseña debe tener al menos 4 caracteres");
            return;
        }

        const btn = e.target.querySelector('button');
        btn.innerText = "Creando cuenta...";
        btn.disabled = true;

        try {
            const response = await fetch(`${BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    password, 
                    email, 
                    name, 
                    phone,
                    address, // Ahora sí están definidos
                    role 
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert("✅ Registro exitoso. Por favor, inicia sesión.");
                toggleAuth(); 
                registerForm.reset();
            } else {
                alert("⚠️ " + (data.message || "Error al registrar"));
            }

        } catch (error) {
            console.error("Error en registro:", error);
            alert("❌ Error de conexión al registrar el usuario");
        } finally {
            btn.innerText = "Crear mi Cuenta";
            btn.disabled = false;
        }
    });
}