const BASE_URL = 'http://localhost:3000';

// 1. Cargar los items al abrir la página
document.addEventListener('DOMContentLoaded', () => {
    renderRentalCart();
    // Establecer la fecha de devolución por defecto a mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    document.getElementById('date_end_plan').value = tomorrow.toISOString().slice(0,16);
});

// 2. Renderizar el carrito de rentas
function renderRentalCart() {
    // Asumimos que guardas los equipos a rentar en 'rentalCart' en el localStorage
    const cartString = localStorage.getItem('rentalCart');
    const cartItems = cartString ? JSON.parse(cartString) : [];
    
    const listContainer = document.getElementById('rental-items-list');
    const totalElement = document.getElementById('rental-total');

    if (cartItems.length === 0) {
        listContainer.innerHTML = '<li class="list-group-item bg-dark text-white text-center text-muted">No hay equipos seleccionados</li>';
        totalElement.textContent = '$0.00';
        return;
    }

    let total = 0;
    listContainer.innerHTML = cartItems.map(item => {
        const subtotal = item.price * (item.quantity || 1);
        total += subtotal;
        return `
            <li class="list-group-item bg-dark text-white d-flex justify-content-between align-items-center border-secondary">
                <div>
                    <h6 class="my-0">${item.name}</h6>
                    <small class="text-muted">ID: ${item.id.substring(0,6)}</small>
                </div>
                <span class="text-success">$${subtotal.toFixed(2)}</span>
            </li>
        `;
    }).join('');

    totalElement.textContent = `$${total.toFixed(2)}`;
}

// 3. Procesar la Renta (Enviar al Backend)
async function procesarRenta() {
    const form = document.getElementById('rental-form');
    
    // Validar campos obligatorios de HTML5
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const cartString = localStorage.getItem('rentalCart');
    const cartItems = cartString ? JSON.parse(cartString) : [];

    if (cartItems.length === 0) {
        alert("El carrito de rentas está vacío.");
        return;
    }

    // Extraer datos del vendedor activo (el que está usando el sistema)
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { id: 'vendedor_default' };

    // Construir el objeto a enviar al backend
    const payload = {
        userId: user.id || user.ID,
        client_name: document.getElementById('client_name').value.trim(),
        client_id_card: document.getElementById('client_id_card').value.trim(),
        client_phone: document.getElementById('client_phone').value.trim(),
        client_email: document.getElementById('client_email').value.trim(),
        date_end_plan: new Date(document.getElementById('date_end_plan').value).toISOString(),
        cartItems: cartItems
    };

    try {
        const response = await fetch(`${BASE_URL}/api/rentas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            alert(`¡Renta confirmada!\nFolio: ${data.rentalId.substring(0,8)}`);
            // Limpiar carrito
            localStorage.removeItem('rentalCart');
            // Redirigir al historial de rentas (o al menú)
            window.location.href = 'historial_rentas.html'; 
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        console.error("Error en la solicitud:", error);
        alert("Hubo un problema de conexión con el servidor.");
    }
}