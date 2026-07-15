// ui-settings.js

// 1. Cargar preferencias al abrir CUALQUIER pestaña
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('user-theme') || 'light';
    const savedFont = localStorage.getItem('user-font') || "-apple-system, BlinkMacSystemFont, 'Segoe UI'";

    applyTheme(savedTheme);
    applyFont(savedFont);

    // Si la página tiene los selectores de personalización, actualiza su valor visual
    const themeSelect = document.getElementById('theme-select');
    const fontSelect = document.getElementById('font-select');
    if (themeSelect) themeSelect.value = savedTheme;
    if (fontSelect) fontSelect.value = savedFont;
});

// 2. Funciones globales para cambiar y guardar
function changeTheme(theme) {
    applyTheme(theme);
    localStorage.setItem('user-theme', theme);
}

function applyTheme(theme) {
    // Quitamos todas las clases de tema posibles
    document.body.classList.remove('dark-theme', 'ocean-theme', 'forest-theme', 'light-theme');
    // Aplicamos la nueva
    if (theme !== 'light') {
        document.body.classList.add(`${theme}-theme`);
    }
}

function changeFont(font) {
    document.documentElement.style.setProperty('--main-font', font);
    localStorage.setItem('user-font', font);
}

function applyFont(font) {
    document.body.style.fontFamily = font;
}

// 3. Control del Modal (Para las pestañas que lo tengan)
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    }
}