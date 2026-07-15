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
                    <button onclick="removeItem('${item.id}')" style="background-color: #dc3545; padding: 5px; border-radius: 4px; color: white; border: none; cursor: pointer;">X</button>
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

async function checkout() {
    const cartData = localStorage.getItem('cart');
    const cart = cartData ? JSON.parse(cartData) : [];

    if (cart.length === 0) return alert("El carrito está vacío.");

    try {
        const response = await fetch(`${BASE_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart })
        });
        
        const result = await response.json();

        if (response.ok) {
            alert(`🎉 Compra Finalizada. Se descargará su ticket.`);
            
            // LLAMADA A LA GENERACIÓN DEL PDF
            generarPDFVenta(cart, parseFloat(result.total_paid));
            
            localStorage.removeItem('cart');
            loadCart(); 
        } else {
            alert(`❌ Error: ${result.message}`);
        }
    } catch (error) {
        alert("Error de conexión con el servidor.");
    }
}

function generarPDFVenta(items, total) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("TICKET DE VENTA DIGITAL", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 15, 30);

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
    doc.text(`TOTAL PAGADO: $${total.toFixed(2)}`, 195, finalY, { align: "right" });

    doc.save(`Ticket_Venta_${Date.now()}.pdf`);
}

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