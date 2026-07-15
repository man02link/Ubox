document.addEventListener('DOMContentLoaded', fetchProducts);

// 1. Protección de ruta
(function checkAuth() {
    const loggedIn = localStorage.getItem('isLoggedIn');
    const userId = localStorage.getItem('userId');
    if (!loggedIn || !userId) window.location.href = 'login.html';
})();

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// 2. Modales (Temas y Exportación)
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
}

function toggleExportModal() {
    const modal = document.getElementById('export-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
}

// 3. Procesar Exportación
async function runExport(format) {
    toggleExportModal();
    if (format === 'pdf') await exportarCatalogoPDF();
    else if (format === 'excel') await exportarCatalogoExcel();
}

// 4. Carga de Productos
async function fetchProducts() {
    const productList = document.getElementById('product-list');
    const currentUserId = localStorage.getItem('userId');
    productList.innerHTML = '<p id="loading-message">Cargando tus productos...</p>';

    try {
        const response = await fetch(`http://localhost:3000/products?userId=${currentUserId}`);
        const resultData = await response.json();
        productList.innerHTML = ''; 

        if (resultData.products && resultData.products.length > 0) {
            resultData.products.forEach(product => {
                productList.appendChild(createProductCard(product));
            });
        } else {
            productList.innerHTML = '<p style="text-align: center; width: 100%; color: #888;">No hay productos.</p>';
        }
    } catch (error) {
        productList.innerHTML = '<p style="color:red; text-align:center;">Error de conexión.</p>';
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const imageUrl = product.image_path ? `http://localhost:3000/uploads/${product.image_path}` : 'https://via.placeholder.com/250x150';

    card.innerHTML = `
        <div onclick="window.location.href='producto.html?id=${product.id}'" style="cursor: pointer;">
            <img src="${imageUrl}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 8px;">
            <h3>${product.name}</h3>
            <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
            <p>Stock: ${product.quantity}</p>
        </div>
        <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 10px; text-align: center;">
            <div id="qr-cat-${product.id}" style="background: white; padding: 5px; display: inline-block; border-radius: 4px;"></div>
        </div>
    `;

    setTimeout(() => {
        new QRCode(document.getElementById(`qr-cat-${product.id}`), {
            text: `http://localhost:3000/generate-card/${product.id}`,
            width: 55, height: 55
        });
    }, 50);

    return card;
}

// 5. Funciones de Exportación (PDF y Excel)
async function exportarCatalogoPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const currentUserId = localStorage.getItem('userId');

    try {
        const res = await fetch(`http://localhost:3000/products?userId=${currentUserId}`);
        const data = await res.json();
        doc.text("Catálogo UBOX", 14, 20);
        
        const rows = [];
        for (const p of data.products) {
            let b64 = null;
            if (p.image_path) try { b64 = await toBase64(`http://localhost:3000/uploads/${p.image_path}`); } catch(e){}
            rows.push({ img: b64, name: p.name, price: `$${p.price}`, stock: p.quantity });
        }

        doc.autoTable({
            startY: 30,
            head: [['Imagen', 'Producto', 'Precio', 'Stock']],
            body: rows.map(r => ['', r.name, r.price, r.stock]),
            didDrawCell: (d) => {
                if (d.section === 'body' && d.column.index === 0 && rows[d.row.index].img) {
                    doc.addImage(rows[d.row.index].img, 'JPEG', d.cell.x + 2, d.cell.y + 2, 20, 15);
                }
            },
            columnStyles: { 0: { cellWidth: 25, minCellHeight: 20 } }
        });
        doc.save("Catalogo.pdf");
    } catch (e) { alert("Error PDF"); }
}

async function exportarCatalogoExcel() {
    const currentUserId = localStorage.getItem('userId');
    const res = await fetch(`http://localhost:3000/products?userId=${currentUserId}`);
    const data = await res.json();
    const ws = XLSX.utils.json_to_sheet(data.products.map(p => ({ Producto: p.name, Marca: p.brand, Precio: p.price, Stock: p.quantity })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Inventario.xlsx");
}

async function toBase64(url) {
    const r = await fetch(url);
    const b = await r.blob();
    return new Promise(v => { const f = new FileReader(); f.onloadend = () => v(f.result); f.readAsDataURL(b); });
}