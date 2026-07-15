document.addEventListener('DOMContentLoaded', fetchProducts);

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

// 3. Obtener productos (FILTRADOS POR USUARIO)
async function fetchProducts() {
    const productList = document.getElementById('product-list');
    const currentUserId = localStorage.getItem('userId'); // Obtenemos el ID guardado al hacer login
    
    productList.innerHTML = '<p id="loading-message">Cargando tus productos...</p>';

    try {
        // ⚠️ CAMBIO CLAVE: Enviamos el userId en la URL para que el servidor filtre
        const response = await fetch(`http://localhost:3000/products?userId=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const resultData = await response.json();

        productList.innerHTML = ''; 

        if (resultData.products && resultData.products.length > 0) {
            
            resultData.products.forEach(product => {
                const link = createProductCard(product); 
                productList.appendChild(link);
            });
            
        } else {
            // Mensaje personalizado si es un usuario nuevo
            productList.innerHTML = `
                <div style="text-align: center; width: 100%; color: #888;">
                    <p>Aún no has registrado productos.</p>
                    <p>¡Usa el botón de "Agregar" para empezar tu inventario!</p>
                </div>`;
        }
        
    } catch (error) {
        console.error('Error al obtener productos:', error);
        productList.innerHTML = `<p style="color:red; font-weight: bold;">Error de conexión. Verifica que el servidor (node index.js) esté encendido.</p>`;
    }
}

/**
 * Crea el elemento visual para el producto
 */
function createProductCard(product) {
    const link = document.createElement('a');
    link.href = `producto.html?id=${product.id}`; 
    link.target = "_self"; 
    link.style.textDecoration = 'none'; // Quitar subrayado del enlace

    const card = document.createElement('div');
    card.className = 'product-card';
    
    const image_path = product.image_path;
    const imageUrl = image_path 
        ? `http://localhost:3000/uploads/${image_path}`
        : 'https://via.placeholder.com/250x150?text=Sin+Imagen';
    
    const formattedPrice = parseFloat(product.price).toFixed(2);

    card.innerHTML = `
        <img src="${imageUrl}" 
             alt="${product.name}" 
             style="object-fit: cover;"
             onerror="this.onerror=null;this.src='https://via.placeholder.com/250x150?text=Error+Carga'">
        <h3>${product.name}</h3>
        <p class="price">$${formattedPrice}</p>
        <p>Stock: ${product.quantity}</p>
        <small style="color: #aaa;">Ref: ${product.id.substring(0, 8)}</small>
    `;

    link.appendChild(card);
    return link; 
}