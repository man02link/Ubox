// 🛡️ Protección de ruta original
(function checkAuth() {
    const loggedIn = localStorage.getItem('isLoggedIn');
    if (!loggedIn) window.location.href = 'login.html';
})();
// 2. Función para cerrar sesión (Limpieza completa)
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('userId'); // Importante: borrar el ID
    localStorage.removeItem('role');
    
    window.location.href = 'login.html';
}
document.addEventListener('DOMContentLoaded', fetchProductDetail);

async function fetchProductDetail() {
    const container = document.getElementById('product-detail-container');
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        container.innerHTML = `<p style="color:red; text-align:center;">Error: ID no especificado.</p>`;
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/products/${productId}`);
        const resultData = await response.json();

        if (response.ok && resultData.product) {
            renderProduct(resultData.product);
        } else {
            container.innerHTML = `<p style="text-align:center;">El producto no existe.</p>`;
        }
    } catch (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Error de conexión con el servidor.</p>`;
    }
}

function renderProduct(product) {
    const container = document.getElementById('product-detail-container');
    const imageUrl = product.image_path 
        ? `http://localhost:3000/uploads/${product.image_path}` 
        : 'https://via.placeholder.com/400x300';

    container.innerHTML = `
        <div class="product-detail">
            <div class="image-section">
                <img src="${imageUrl}" alt="${product.name}">
            </div>
            
            <div class="info-section">
                <span class="badge">${product.brand || 'Genérico'}</span>
                <h2 style="margin-top: 10px;">${product.name}</h2>
                <p class="detail-price">Precio: <strong>$${parseFloat(product.price).toFixed(2)}</strong></p>
                
                <div class="description-section" style="margin: 20px 0; border-top: 1px solid #444; padding-top: 15px;">
                    <p style="font-size: 0.95em; color: #eee; white-space: pre-wrap;">${product.Descripcion || 'Sin descripción.'}</p>
                </div>

                <div style="margin-top: 30px; text-align: center;">
                    <div style="background: white; padding: 15px; display: inline-block; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                        <div id="qrcode"></div>
                    </div>
                    <p style="margin-top: 10px; color: #ffc107; font-size: 13px; font-weight: bold;">
                        📸 ESCANEA PARA OBTENER FICHA DIRECTA
                    </p>
                </div>

                <form id="add-to-cart-form" style="margin-top: 30px; display: flex; gap: 10px;">
                    <input type="number" id="product-quantity" value="1" min="1" max="${product.quantity}" 
                           style="width: 70px; padding: 10px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
                    <button type="submit" class="button" style="flex: 1; margin: 0;">🛒 Añadir al Carrito</button>
                </form>
            </div>
        </div>
    `;

    // 🚀 GENERAR EL QR GRANDE ($200x200)
    // El QR apunta directamente a la ruta del servidor que genera la imagen
    const imageServiceUrl = `http://localhost:3000/generate-card/${product.id}`;

    new QRCode(document.getElementById("qrcode"), {
        text: imageServiceUrl,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H // Nivel alto para mejor escaneo
    });

    // Lógica del carrito
    document.getElementById('add-to-cart-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const qty = parseInt(document.getElementById('product-quantity').value);
        addToCart(product, qty);
    });
}

function addToCart(product, quantity) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const index = cart.findIndex(item => item.id === product.id);

    if (index > -1) {
        cart[index].quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image_path: product.image_path,
            quantity: quantity 
        });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`Se añadieron ${quantity} unidades de "${product.name}" al carrito.`);
}