// proveedor.js - Gestión Completa de Proveedores y Stock
const BASE_URL = 'http://localhost:3000';

// 1. Obtener el ID del usuario actual de la sesión
const currentUserId = localStorage.getItem('userId');

// Protección de ruta: Si no hay sesión, redirigir al login
(function checkAuth() {
    const loggedIn = localStorage.getItem('isLoggedIn');
    if (!loggedIn || !currentUserId) {
        window.location.href = 'login.html';
    }
})();

// Función para cerrar sesión
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // Configuración de eventos para formularios
    const supplierForm = document.getElementById('supplier-form');
    const restockForm = document.getElementById('restock-form');

    if (supplierForm) supplierForm.addEventListener('submit', handleFormSubmit);
    if (restockForm) restockForm.addEventListener('submit', handleRestockSubmit); 
    
    // Carga inicial de datos filtrados
    fetchSuppliers();
    fetchProductsForRestock(); 
});

const restockResultsDiv = document.getElementById('restock-results');
const listContainer = document.getElementById('supplier-list-container');
const formTitle = document.getElementById('form-title');
const submitButton = document.getElementById('submit-button');

// --- FEEDBACK VISUAL ---
function displayResult(message, isError = false, targetDiv = restockResultsDiv) {
    if (!targetDiv) return;
    targetDiv.className = `msg-box ${isError ? 'error' : 'success'}`;
    targetDiv.innerHTML = message;
    targetDiv.style.display = 'block';
    setTimeout(() => { targetDiv.style.display = 'none'; }, 5000);
}

// ==========================================================
// 🚛 GESTIÓN DE REABASTECIMIENTO (STOCK + PDF)
// ==========================================================

async function fetchProductsForRestock() {
    try {
        // Consultamos productos y proveedores enviando el Id_user como query param
        const [pResp, sResp] = await Promise.all([
            fetch(`${BASE_URL}/products?Id_user=${currentUserId}`),
            fetch(`${BASE_URL}/suppliers?Id_user=${currentUserId}`)
        ]);
        const pData = await pResp.json();
        const sData = await sResp.json();

        const pSelect = document.getElementById('restock-product-select');
        const sSelect = document.getElementById('restock-supplier-select');

        // --- SELECTOR DE PRODUCTOS ---
        if (pSelect) {
            pSelect.innerHTML = '<option value="">-- Seleccione un Producto --</option>';
            
            // Usamos (pData.products || []) para evitar errores si la base de datos responde vacío
            (pData.products || [])
                .filter(p => p.Id_user === currentUserId) // Filtro estricto por usuario
                .forEach(p => {
                    pSelect.add(new Option(`${p.name} (Stock: ${p.quantity})`, p.id));
                });
        }

        // --- SELECTOR DE PROVEEDORES ---
        if (sSelect) {
            sSelect.innerHTML = '<option value="">-- No especificar --</option>';
            
            // Aplicamos la misma seguridad y filtro para los proveedores
            (sData.suppliers || [])
                .filter(s => s.Id_user === currentUserId) // Filtro estricto por usuario
                .forEach(s => {
                    sSelect.add(new Option(s.name, s.id));
                });
        }
    } catch (e) { 
        console.error("Error al cargar selectores", e); 
    }
}

async function handleRestockSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById('restock-product-select').value;
    const supplierId = document.getElementById('restock-supplier-select').value;
    const quantity = parseInt(document.getElementById('restock-quantity').value);

    if (!productId || isNaN(quantity)) return displayResult("Seleccione un producto y cantidad válida", true);

    const productText = document.getElementById('restock-product-select').selectedOptions[0].text.split(' (Stock')[0];
    const supplierText = supplierId ? document.getElementById('restock-supplier-select').selectedOptions[0].text : "Proveedor No Especificado";

    try {
        const response = await fetch(`${BASE_URL}/restock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Enviamos el userId para que el servidor valide la propiedad del producto
            body: JSON.stringify({ 
                productId, 
                supplierId: supplierId || null, 
                quantity, 
                userId: currentUserId 
            })
        });
        const result = await response.json();

        if (response.ok) {
            displayResult(`✅ Stock actualizado para: ${productText}`);
            generarPDFCompra({
                productName: productText,
                supplierName: supplierText,
                quantityAdded: quantity,
                newQuantity: result.newQuantity,
                productId
            });
            document.getElementById('restock-form').reset();
            fetchProductsForRestock();
        } else {
            displayResult(`⚠️ ${result.message}`, true);
        }
    } catch (err) { 
        displayResult("❌ Error en el servidor", true); 
    }
}

function generarPDFCompra(datos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Encabezado estilizado
    doc.setFillColor(40, 167, 69);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.text("COMPROBANTE DE ENTRADA ALMACÉN", 105, 13, { align: "center" });
    
    doc.autoTable({
        startY: 30,
        head: [['Detalle', 'Información']],
        body: [
            ['Producto', datos.productName],
            ['ID Referencia', datos.productId],
            ['Proveedor', datos.supplierName],
            ['Cantidad Añadida', `+ ${datos.quantityAdded}`],
            ['Stock Resultante', `${datos.newQuantity} unidades`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [40, 167, 69] }
    });
    doc.save(`Ticket_Entrada_${datos.productName}.pdf`);
}

// ==========================================================
// 🏭 CRUD DE PROVEEDORES (FILTRADO POR USUARIO)
// ==========================================================

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('supplier-id').value;
    const supplierData = {
        name: document.getElementById('supplier-name').value,
        contact_name: document.getElementById('contact-name').value,
        phone: document.getElementById('supplier-phone').value,
        email: document.getElementById('supplier-email').value,
        address: document.getElementById('supplier-address').value,
        Id_user: currentUserId // Asociamos el proveedor al usuario actual
    };

    try {
        const url = id ? `${BASE_URL}/suppliers/${id}` : `${BASE_URL}/suppliers`;
        const method = id ? 'PATCH' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supplierData)
        });

        if (response.ok) {
            displayResult(`✅ Proveedor "${supplierData.name}" guardado.`);
            resetForm();
            fetchSuppliers();
            fetchProductsForRestock();
        } else {
            const error = await response.json();
            displayResult(`❌ ${error.message}`, true);
        }
    } catch (err) { 
        console.error("Error al guardar proveedor", err); 
    }
}

async function fetchSuppliers() {
    try {
        // Petición GET filtrando por el ID del usuario
        const response = await fetch(`${BASE_URL}/suppliers?Id_user=${currentUserId}`);
        const data = await response.json();
        const suppliers = data.suppliers || [];

        listContainer.innerHTML = '';

        if (suppliers.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:20px;">No tienes proveedores registrados.</div>';
            return;
        }

        let table = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Empresa / Dirección</th>
                        <th>Contacto</th>
                        <th>Comunicación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>`;

        suppliers.forEach(s => {
            const waPhone = s.phone ? s.phone.replace(/\D/g, '') : '';
            const mapLink = s.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}` : '#';
            
            table += `
                <tr>
                    <td>
                        <strong>${s.name}</strong><br>
                        ${s.address ? 
                            `<a href="${mapLink}" target="_blank" class="link-maps">📍 ${s.address}</a>` : 
                            '<small style="color:#666">Sin dirección</small>'}
                    </td>
                    <td>${s.contact_name || 'N/A'}</td>
                    <td>
                        <div class="comm-links">
                            ${s.email ? `<a href="mailto:${s.email}" class="link-contact mail">✉️ Correo</a>` : ''}
                            ${s.phone ? `<a href="https://wa.me/${waPhone}" target="_blank" class="link-contact wa">📱 WhatsApp</a>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="actions">
                            <button onclick="editSupplier('${s.id}')" class="btn-edit">✏️</button>
                            <button onclick="deleteSupplier('${s.id}')" class="btn-delete">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        });
        table += `</tbody></table>`;
        listContainer.innerHTML = table;
    } catch (e) { 
        listContainer.innerHTML = '<div class="msg-box error">Error al conectar con el servidor.</div>'; 
    }
}

window.editSupplier = async (id) => {
    try {
        const res = await fetch(`${BASE_URL}/suppliers/${id}?Id_user=${currentUserId}`);
        const data = await res.json();
        const s = data.supplier;
        
        document.getElementById('supplier-id').value = s.id;
        document.getElementById('supplier-name').value = s.name;
        document.getElementById('contact-name').value = s.contact_name || '';
        document.getElementById('supplier-phone').value = s.phone || '';
        document.getElementById('supplier-email').value = s.email || '';
        document.getElementById('supplier-address').value = s.address || '';
        
        formTitle.innerText = "✏️ Editando Proveedor";
        submitButton.innerText = "Actualizar";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        console.error("Error al cargar proveedor para editar", e);
    }
};

window.deleteSupplier = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este proveedor?")) {
        try {
            const response = await fetch(`${BASE_URL}/suppliers/${id}`, { 
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Id_user: currentUserId }) // Validamos propiedad
            });

            if (response.ok) {
                fetchSuppliers();
                fetchProductsForRestock();
            } else {
                alert("No tienes permiso para eliminar este registro.");
            }
        } catch (e) {
            console.error("Error al eliminar", e);
        }
    }
};

window.resetForm = () => {
    document.getElementById('supplier-form').reset();
    document.getElementById('supplier-id').value = '';
    formTitle.innerText = "👤 Nuevo Proveedor";
    submitButton.innerText = "Guardar Proveedor";
};