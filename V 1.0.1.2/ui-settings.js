// ui-settings.js

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('user-theme') || 'root';
    const savedFont = localStorage.getItem('user-font') || "-apple-system, BlinkMacSystemFont, 'Segoe UI'";

    applyTheme(savedTheme);
    applyFont(savedFont);

    const themeSelect = document.getElementById('theme-select');
    const fontSelect = document.getElementById('font-select');
    if (themeSelect) themeSelect.value = savedTheme;
    if (fontSelect) fontSelect.value = savedFont;
});

function changeTheme(theme) {
    applyTheme(theme);
    localStorage.setItem('user-theme', theme);
}

function applyTheme(theme) {
    document.body.classList.remove('dark-theme', 'ocean-theme', 'forest-theme', 'light-theme');
    if (theme !== 'root') {
        document.body.classList.add(`${theme}-theme`);
    }
}

function changeFont(font) {
    applyFont(font);
    localStorage.setItem('user-font', font);
}

function applyFont(font) {
    document.body.style.fontFamily = font;
    // También aplicamos a la variable CSS por si acaso
    document.documentElement.style.setProperty('--main-font', font);
}

// MEJORADO: Lógica de apertura/cierre más fiable
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        // Si está oculto o no tiene estilo definido, mostrarlo
        if (modal.style.display === 'none' || modal.style.display === '') {
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    }
}