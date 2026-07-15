// producto.js - Versión Actualizada con Marca, Proveedor y Descripción

// Protección de ruta
(function checkAuth() {
    const loggedIn = localStorage.getItem('isLoggedIn');
    if (!loggedIn) {
        // Si no hay sesión, mándalo al login
        window.location.href = 'login.html';
    }
})();

// Función para cerrar sesión (Añádela a tus botones de Logout)
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', fetchProductDetail);

async function fetchProductDetail() {
    const container = document.getElementById('product-detail-container');
    
    // 1. Obtener el ID del parámetro de búsqueda en la URL (?id=...)
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        container.innerHTML = `<p style="color:red; text-align:center;">Error: No se encontró el ID del producto.</p>`;
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/products/${productId}`);
        
        if (!response.ok) {
            throw new Error(`Producto no encontrado (${response.status})`);
        }
        
        const resultData = await response.json();
        container.innerHTML = ''; 

        if (resultData.product) {
            const product = resultData.product;
            
            // 2. Mostrar el detalle con los nuevos campos
            const detailElement = createDetailView(product);
            container.appendChild(detailElement);
            
            // 3. Evento para el formulario de carrito
            document.getElementById('add-to-cart-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const quantityInput = document.getElementById('product-quantity').value;
                const quantity = parseInt(quantityInput);
                
                if (quantity > 0 && quantity <= product.quantity) {
                    addToCart(product, quantity);
                } else if (quantity > product.quantity) {
                    alert(`Stock insuficiente. Solo quedan ${product.quantity} unidades.`);
                } else {
                    alert('Por favor, ingresa una cantidad válida.');
                }
            });

        } else {
            container.innerHTML = `<p style="text-align:center;">El producto solicitado no existe.</p>`;
        }
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `<p style="color:red; font-weight: bold; text-align:center;">Error: ${error.message}</p>`;
    }
}

/**
 * Crea la estructura visual incluyendo Marca, Proveedor y Descripción
 */
function createDetailView(product) {
    const detailDiv = document.createElement('div');
    detailDiv.className = 'product-detail';

    const imageUrl = product.image_path 
        ? `http://localhost:3000/uploads/${product.image_path}` 
        : 'https://via.placeholder.com/400x300?text=Sin+Imagen';
    
    const formattedPrice = parseFloat(product.price).toFixed(2);
    
    // Formateo de campos nuevos
    const brand = product.brand || 'Genérico';
    const supplier = product.Id_suppliers || 'No asignado';
    // --- CAMBIO: Se añade la descripción ---
    const description = product.Descripcion || 'Sin descripción disponible.';

    detailDiv.innerHTML = `
        <div class="image-section">
            <img src="${imageUrl}" alt="${product.name}" 
                 onerror="this.onerror=null;this.src='https://via.placeholder.com/400x300?text=Error+Carga'">
        </div>
        <div class="info-section">
            <span class="badge">${brand}</span>
            <h2 style="margin-top: 10px;">${product.name}</h2>
            
            <p class="detail-price">Precio: <strong>$${formattedPrice}</strong></p>
            <p class="detail-quantity">Disponibilidad: <strong>${product.quantity} unidades</strong></p>
            
            <div style="background: #2d2d2d; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-size: 0.9em; color: #aaa;">Proveedor asignado:</p>
                <code style="color: #4fc3f7;">${supplier}</code>
            </div>

            <div class="description-section" style="margin: 20px 0; border-top: 1px solid #444; padding-top: 15px;">
                <h4 style="color: #ffc107; margin-bottom: 8px;">Descripción del Producto:</h4>
                <p style="font-size: 0.95em; line-height: 1.5; color: #eee; white-space: pre-wrap;">${description}</p>
            </div>

            <form id="add-to-cart-form">
                <label for="product-quantity">Selecciona cantidad:</label>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <input type="number" id="product-quantity" value="1" min="1" max="${product.quantity}" required 
                           style="padding: 10px; width: 70px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
                    <button type="submit" class="button" style="margin: 0; flex: 1;">🛒 Añadir al Carrito</button>
                </div>
            </form>
            
            <p style="margin-top: 30px; font-size: 0.75em; color: #666;">ID Único: ${product.id}</p>
        </div>
    `;
    return detailDiv;
}

/**
 * Lógica de LocalStorage para el carrito
 */
function addToCart(product, quantity) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItemIndex = cart.findIndex(item => item.id === product.id);

    if (existingItemIndex > -1) {
        const newTotal = cart[existingItemIndex].quantity + quantity;
        if (newTotal <= product.quantity) {
             cart[existingItemIndex].quantity = newTotal;
             alert(`¡Carrito actualizado! Ahora tienes ${newTotal} unidades de este producto.`);
        } else {
             alert(`No puedes añadir más. Stock máximo: ${product.quantity}`);
             return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            brand: product.brand, // Guardamos también la marca en el carrito
            image_path: product.image_path,
            max_stock: product.quantity,
            quantity: quantity 
        });
        alert(`"${product.name}" añadido al carrito correctamente.`);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
}