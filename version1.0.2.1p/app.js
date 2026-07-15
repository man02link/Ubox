// app.js - Gestión de Inventario con Soporte para Descripción y Usuario

// Protección de ruta: Verifica que el usuario esté logueado
(function checkAuth() {
    const loggedIn = localStorage.getItem('isLoggedIn');
    const userId = localStorage.getItem('userId');
    if (!loggedIn || !userId) {
        window.location.href = 'login.html';
    }
})();

// Función para cerrar sesión
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('product-form').addEventListener('submit', handleFormSubmit);
    fetchProducts();
    fetchSuppliersForSelect(); 
});

const BASE_URL = 'http://localhost:3000';
const resultsDiv = document.getElementById('results-box');
const listContainer = document.getElementById('product-list-container');
const formTitle = document.getElementById('form-title');
const submitButton = document.getElementById('submit-button');

/**
 * 1. Carga los proveedores del usuario para el select
 */
async function fetchSuppliersForSelect() {
    const select = document.getElementById('product-supplier');
    if (!select) return;

    const currentUserId = localStorage.getItem('userId');

    try {
        const response = await fetch(`${BASE_URL}/suppliers?userId=${currentUserId}`);
        const result = await response.json();

        if (response.ok && result.suppliers) {
            select.innerHTML = '<option value="">-- Seleccionar Proveedor --</option>';
            result.suppliers.forEach(sup => {
                const option = document.createElement('option');
                option.value = sup.id; 
                option.textContent = sup.name; 
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error cargando proveedores:", error);
    }
}

/**
 * 2. Maneja el envío del formulario (POST y PATCH)
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('product-id').value;
    const isEditing = !!id; 
    const form = document.getElementById('product-form');
    const formData = new FormData(form);
    const currentUserId = localStorage.getItem('userId');

    // Obtenemos la descripción manualmente para asegurar el nombre del campo
    const descripcionValue = document.getElementById('product-description').value;

    if (isEditing) {
        // Para PATCH usamos JSON (El servidor espera "Descripcion" con D mayúscula)
        const bodyData = {
            name: formData.get('name'),
            brand: formData.get('brand'),
            price: formData.get('price'),
            quantity: formData.get('quantity'),
            Descripcion: descripcionValue, 
            Id_suppliers: formData.get('Id_suppliers'),
            image_path: document.getElementById('image-preview').dataset.path || null
        };

        try {
            const response = await fetch(`${BASE_URL}/products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            if (response.ok) {
                displayResult("✅ Producto actualizado correctamente.");
                resetForm();
                fetchProducts();
            } else {
                const err = await response.json();
                displayResult(`❌ Error: ${err.message}`, true);
            }
        } catch (error) {
            displayResult("❌ Error de conexión al actualizar.", true);
        }
        return;
    }

    // PRODUCTO NUEVO (POST)
    // Sincronizamos los nombres de campos con lo que espera el index.js
    formData.append('userId', currentUserId);
    formData.append('Descripcion', descripcionValue); 

    try {
        const response = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            body: formData 
        });

        if (response.ok) {
            displayResult("✅ Producto registrado con éxito.");
            resetForm();
            fetchProducts();
        } else {
            const err = await response.json();
            displayResult(`❌ Error: ${err.message}`, true);
        }
    } catch (error) {
        displayResult("❌ Error de conexión al crear.", true);
    }
}

/**
 * 3. Carga datos en el formulario para editar
 */
window.editProduct = async function(id) {
    try {
        const response = await fetch(`${BASE_URL}/products/${id}`);
        const result = await response.json();

        if (response.ok && result.product) {
            const p = result.product;

            document.getElementById('product-id').value = p.id;
            document.getElementById('product-name').value = p.name;
            document.getElementById('product-brand').value = p.brand || '';
            document.getElementById('product-price').value = p.price;
            document.getElementById('product-quantity').value = p.quantity;
            document.getElementById('product-supplier').value = p.Id_suppliers || '';
            
            // Cargar la descripción en el textarea
            if(document.getElementById('product-description')){
                document.getElementById('product-description').value = p.Descripcion || '';
            }
            
            const imgPreview = document.getElementById('image-preview');
            const imgContainer = document.getElementById('current-image-preview');
            
            if (p.image_path) {
                imgPreview.src = `${BASE_URL}/uploads/${p.image_path}`;
                imgPreview.dataset.path = p.image_path;
                imgContainer.style.display = 'block';
            } else {
                imgContainer.style.display = 'none';
            }

            formTitle.textContent = `✏️ Editando: ${p.name}`;
            submitButton.textContent = 'Actualizar Producto';
            submitButton.style.backgroundColor = '#17a2b8';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        displayResult("❌ No se pudieron cargar los datos.", true);
    }
}

/**
 * 4. Obtiene y muestra la lista de productos del usuario
 */
async function fetchProducts() {
    const currentUserId = localStorage.getItem('userId');
    try {
        const response = await fetch(`${BASE_URL}/products?userId=${currentUserId}`);
        const result = await response.json();
        listContainer.innerHTML = '';

        if (response.ok && result.products.length > 0) {
            renderProductsTable(result.products);
        } else {
            listContainer.innerHTML = '<p style="text-align:center;">No tienes productos registrados.</p>';
        }
    } catch (error) {
        listContainer.innerHTML = '<p style="color:red;">Error al conectar con el servidor.</p>';
    }
}

/**
 * 5. Renderiza la tabla de datos
 */
function renderProductsTable(products) {
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Imagen</th>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    products.forEach(p => {
        const img = p.image_path ? `${BASE_URL}/uploads/${p.image_path}` : 'https://via.placeholder.com/50';
        html += `
            <tr>
                <td><img src="${img}" class="product-thumb" width="50"></td>
                <td><strong>${p.name}</strong><br><small>${p.brand || ''}</small></td>
                <td>$${parseFloat(p.price).toFixed(2)}</td>
                <td>${p.quantity}</td>
                <td>
                    <button onclick="editProduct('${p.id}')" class="btn-edit">Editar</button>
                    <button onclick="deleteProduct('${p.id}')" class="btn-delete">Eliminar</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    listContainer.innerHTML = html;
}

/**
 * 6. Elimina un producto
 */
window.deleteProduct = async function(id) {
    if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
    try {
        const response = await fetch(`${BASE_URL}/products/${id}`, { method: 'DELETE' });
        if (response.ok) {
            displayResult("🗑️ Producto eliminado.");
            fetchProducts();
        }
    } catch (error) {
        displayResult("❌ Error al eliminar.", true);
    }
}

/**
 * 7. Resetea el formulario al estado original
 */
window.resetForm = function() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('current-image-preview').style.display = 'none';
    formTitle.textContent = '➕ Registrar Nuevo Producto';
    submitButton.textContent = 'Crear Producto';
    submitButton.style.backgroundColor = '#ffc107';
}

/**
 * Muestra mensajes de éxito o error
 */
function displayResult(message, isError = false) {
    resultsDiv.textContent = message;
    resultsDiv.className = isError ? 'result-box error' : 'result-box success';
    resultsDiv.style.display = 'block';
    setTimeout(() => resultsDiv.style.display = 'none', 4000);
}