// ventas.js
const BASE_URL = 'http://localhost:3000';

// 🛡️ 1. Protección de Ruta
(function checkAuth() {
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
    }
})();

// 📥 2. Cargar Historial
async function loadSales() {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const tbody = document.getElementById('sales-tbody');

    if (!user || !user.id) return;

    try {
        const response = await fetch(`${BASE_URL}/sales-history/${user.id}`);
        const data = await response.json();

        if (!data.sales || data.sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px;">No has realizado ventas todavía.</td></tr>';
            return;
        }

        renderSalesTable(data.sales, tbody);
    } catch (error) {
        console.error("Error cargando ventas:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Error al conectar con el servidor.</td></tr>';
    }
}

// 🎨 3. Renderizar Tabla
function renderSalesTable(sales, container) {
    container.innerHTML = sales.map(sale => `
        <tr>
            <td class="order-id">#${sale.saleId.substring(0, 8)}</td>
            <td>${new Date(sale.createdAt).toLocaleString()}</td>
            <td><span class="product-tag" style="color:#bbb; font-size:0.85rem;">${sale.productos_resumen}</span></td>
            <td class="total-cell">$${sale.total_paid.toFixed(2)}</td>
            <td>
                <button class="btn-reprint" id="btn-${sale.saleId}">
                    📄 PDF
                </button>
            </td>
        </tr>
    `).join('');

    // Asignar eventos de clic de forma dinámica
    sales.forEach(sale => {
        document.getElementById(`btn-${sale.saleId}`).addEventListener('click', () => {
            reimprimirTicket(sale);
        });
    });
}

// 📄 4. Lógica de Reimpresión
function reimprimirTicket(sale) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const items = JSON.parse(sale.detalle_json);

    doc.setFontSize(20);
    doc.setTextColor(40, 167, 69);
    doc.text("U-BOX | COPIA DE TICKET", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ID Transacción: ${sale.saleId}`, 15, 40);
    doc.text(`Fecha Original: ${new Date(sale.createdAt).toLocaleString()}`, 15, 46);

    const tableRows = items.map(item => [
        item.name,
        item.quantity,
        `$${parseFloat(item.price).toFixed(2)}`,
        `$${(item.quantity * parseFloat(item.price)).toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 55,
        head: [['Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [40, 167, 69] }
    });

    doc.save(`Reimpresion_UBox_${sale.saleId.substring(0, 8)}.pdf`);
}

document.addEventListener('DOMContentLoaded', loadSales);
