let allProducts = []; // Almacén para búsqueda local

// 2. Función para cerrar sesión (Limpieza completa)
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('userId'); // Importante: borrar el ID
    localStorage.removeItem('role');
    
    window.location.href = 'login.html';
}
document.addEventListener('DOMContentLoaded', () => {
    fetchAllProducts();
    // Configurar buscador
    document.getElementById('client-search').addEventListener('input', (e) => {
        filterProducts(e.target.value);
    });
});

// 1. Modales
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
}

function toggleExportModal() {
    const modal = document.getElementById('export-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
}

function showLoginModal() {
    document.getElementById('login-required-modal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('login-required-modal').style.display = 'none';
}

// 2. Fetch de datos
async function fetchAllProducts() {
    const productList = document.getElementById('product-list');
    try {
        const response = await fetch(`http://localhost:3000/products`);
        const data = await response.json();
        allProducts = data.products || [];
        renderProducts(allProducts);
    } catch (error) {
        productList.innerHTML = '<p style="color:red; text-align:center;">Error al conectar con el servidor.</p>';
    }
}

// 3. Renderizado y Filtro
function renderProducts(products) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    
    if (products.length === 0) {
        productList.innerHTML = '<p style="text-align:center; width:100%; color:#888;">No se encontraron productos.</p>';
        return;
    }

    products.forEach(product => {
        const card = createProductCard(product);
        productList.appendChild(card);
    });
}

function filterProducts(query) {
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        (p.brand && p.brand.toLowerCase().includes(query.toLowerCase()))
    );
    renderProducts(filtered);
}

// 4. Tarjeta de Producto
function createProductCard(product) {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const card = document.createElement('div');
    card.className = 'product-card';
    const imageUrl = product.image_path ? `http://localhost:3000/uploads/${product.image_path}` : 'https://via.placeholder.com/250x150';

    card.innerHTML = `
        <div onclick="window.location.href='producto_cliente.html?id=${product.id}'" style="cursor: pointer;">
            <img src="${imageUrl}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px;">
            <h3>${product.name}</h3>
            <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
        </div>
        <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 10px; text-align: center;">
            <button onclick="agregarAlCarritoRapido(${product.id})" 
                    style="background-color: ${isLoggedIn ? '#28a745' : '#6c757d'}; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 90%;">
                ${isLoggedIn ? '🛒 Añadir al Carrito' : '🔒 Iniciar Sesión'}
            </button>
            <div id="qr-client-${product.id}" style="background: white; padding: 5px; display: inline-block; border-radius: 4px; margin-top: 10px;"></div>
        </div>
    `;

    setTimeout(() => {
        const qrContainer = document.getElementById(`qr-client-${product.id}`);
        if(qrContainer) {
            new QRCode(qrContainer, { text: `http://localhost:3000/generate-card/${product.id}`, width: 50, height: 50 });
        }
    }, 100);

    return card;
}

// 5. Acción de Carrito con Bloqueo
function agregarAlCarritoRapido(id) {
    if (!localStorage.getItem('isLoggedIn')) {
        showLoginModal();
    } else {
        alert("✅ Producto añadido al carrito.");
        // Aquí conectas con tu lógica de carrito.js
    }
}

// 6. Exportación
async function runExport(format) {
    toggleExportModal();
    const data = allProducts;
    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("Catálogo Público", 14, 20);
        doc.autoTable({ startY: 30, head: [['Producto', 'Precio']], body: data.map(p => [p.name, `$${p.price}`]) });
        doc.save("Catalogo_Publico.pdf");
    } else {
        const ws = XLSX.utils.json_to_sheet(data.map(p => ({ Nombre: p.name, Precio: p.price })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Productos");
        XLSX.writeFile(wb, "Lista_Precios.xlsx");
    }
}