// ==========================================================
// 🛡️ PROTECCIÓN DE RUTA Y SESIÓN (SINCRONIZADA)
// ==========================================================
(function checkAuth() {
    const loggedIn = localStorage.getItem('isLoggedIn');
    const user = JSON.parse(localStorage.getItem('user'));

    // Si no hay bandera de login O no existe el objeto usuario con su ID
    if (!loggedIn || !user || !user.id) {
        console.warn("Sesión incompleta detectada. Redirigiendo...");
        localStorage.clear(); // Limpiamos para evitar datos basura
        window.location.href = 'login.html';
    }
})();

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// ==========================================================
// 🛒 CARGA Y RENDERIZADO DEL CARRITO
// ==========================================================
document.addEventListener('DOMContentLoaded', loadCart);

const cartContent = document.getElementById('cart-content');
const cartSummary = document.getElementById('cart-summary');
const BASE_URL = 'http://localhost:3000';

function loadCart() {
    try {
        const cartData = localStorage.getItem('cart');
        const cart = cartData ? JSON.parse(cartData) : [];
        
        if (cart.length === 0) {
            cartContent.innerHTML = '<p>Tu carrito está vacío.</p>';
            cartSummary.innerHTML = '';
            return;
        }

        renderCartTable(cart);
        renderCartSummary(cart);
        
    } catch (e) {
        console.error("Error al cargar carrito:", e);
        cartContent.innerHTML = '<p style="color:red;">Error al cargar datos.</p>';
    }
}

function renderCartTable(cart) {
    let tableHTML = `
        <table class="cart-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;

    cart.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const itemTotal = (price * item.quantity).toFixed(2);
        const imageUrl = item.image_path 
            ? `${BASE_URL}/uploads/${item.image_path}` 
            : 'https://via.placeholder.com/80x60?text=No+Img';

        tableHTML += `
            <tr>
                <td><img src="${imageUrl}" alt="${item.name}" class="cart-item-img"></td>
                <td>${item.name}</td>
                <td>$${price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>$${itemTotal}</td>
                <td>
                    <button onclick="removeItem('${item.id}')" class="btn-remove">X</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    cartContent.innerHTML = tableHTML;
}

function renderCartSummary(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    
    cartSummary.innerHTML = `
        <h3 style="color: #007bff;">Total a Pagar: $${subtotal.toFixed(2)}</h3>
        <button onclick="clearCart()" class="button" style="background-color: #ffc107; color: #212529;">Vaciar Carrito</button>
        <button onclick="checkout()" class="button" style="margin-left: 10px; background-color: #28a745;">✅ Finalizar Compra y Descargar Ticket</button>
    `;
}

// ==========================================================
// 🚀 PROCESAR COMPRA (CHECKOUT)
// ==========================================================
async function checkout() {
    // 1. Validar carrito
    const cartData = localStorage.getItem('cart');
    const cart = cartData ? JSON.parse(cartData) : [];
    if (cart.length === 0) return alert("El carrito está vacío.");

    // 2. Validar usuario (ya filtrado por checkAuth, pero por seguridad lo re-confirmamos)
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 3. Confirmación de compra
    if (!confirm(`¿Confirmar compra por un total de $${calculateTotal(cart)}?`)) return;

    try {
        const response = await fetch(`${BASE_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                items: cart,
                userId: user.id 
            })
        });
        
        const result = await response.json();

        if (response.ok) {
            alert(`🎉 ¡Éxito! Pedido #${result.orderId.substring(0,8)}`);
            generarPDFVenta(cart, parseFloat(result.total_paid), result.orderId);
            localStorage.removeItem('cart');
            loadCart(); 
        } else {
            alert(`❌ Error: ${result.message}`);
        }
    } catch (error) {
        alert("Error de conexión. Asegúrate de que el servidor esté corriendo.");
    }
}

// Función auxiliar para total
function calculateTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
}

// ==========================================================
// 📄 GENERACIÓN DE TICKET PDF
// ==========================================================
function generarPDFVenta(items, total, orderId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(40, 167, 69);
    doc.text("TICKET DE VENTA DIGITAL | U-BOX", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ID Pedido: ${orderId}`, 15, 30);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 15, 35);

    const tableRows = items.map(item => [
        item.name,
        item.quantity,
        `$${parseFloat(item.price).toFixed(2)}`,
        `$${(item.quantity * parseFloat(item.price)).toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 40,
        head: [['Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [40, 167, 69] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`TOTAL PAGADO: $${total.toFixed(2)}`, 195, finalY, { align: "right" });

    doc.save(`Ticket_UBox_${orderId.substring(0,8)}.pdf`);
}

// ==========================================================
// 🗑️ FUNCIONES AUXILIARES
// ==========================================================
function removeItem(productId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart(); 
}

function clearCart() {
    if (confirm('¿Vaciar el carrito?')) {
        localStorage.removeItem('cart');
        loadCart(); 
    }
}