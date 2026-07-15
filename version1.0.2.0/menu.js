// 1. Protección de ruta: Verifica login Y que exista un ID de usuario válido
(function checkAuth() {
    const loggedIn = localStorage.getItem('isLoggedIn');
    const userId = localStorage.getItem('userId');

    // Si falta alguno de los dos, la sesión no es válida
    if (!loggedIn || !userId) {
        window.location.href = 'login.html';
    }
})();

// 2. Función para cerrar sesión (Limpieza completa)
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('userId'); // Importante: borrar el ID
    localStorage.removeItem('role');
    
    window.location.href = 'login.html';
}