const BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', loadRentals);

async function loadRentals() {
    try {
        const response = await fetch(`${BASE_URL}/api/rentas`);
        const rentals = await response.json();
        
        const tableBody = document.getElementById('table-rentals-body');
        const activeCount = document.getElementById('total-active');
        
        let activeTotal = 0;
        tableBody.innerHTML = '';

        rentals.forEach(rent => {
            const isOverdue = new Date(rent.date_end_plan) < new Date() && rent.status === 'active';
            if(rent.status === 'active') activeTotal++;

            // Formatear fechas
            const fechaFin = new Date(rent.date_end_plan).toLocaleString();
            
            // Definir color del Badge
            let statusBadge = '';
            if (rent.status === 'completed') {
                statusBadge = '<span class="badge bg-success">Devuelto</span>';
            } else if (isOverdue) {
                statusBadge = '<span class="badge bg-danger animate-pulse">RETRASADO</span>';
            } else {
                statusBadge = '<span class="badge bg-warning text-dark">En Uso</span>';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="small font-monospace text-info">${rent.id.substring(0, 8)}...</td>
                <td>
                    <strong>${rent.client_name}</strong><br>
                    <small class="text-muted">${rent.client_id_card}</small>
                </td>
                <td class="text-center">${rent.total_articulos}</td>
                <td class="${isOverdue ? 'text-danger fw-bold' : ''}">${fechaFin}</td>
                <td>$${rent.total_contract.toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>
                    ${rent.status === 'active' 
                        ? `<button onclick="procesarDevolucion('${rent.id}')" class="btn btn-sm btn-success">📩 Recibir</button>` 
                        : `<button class="btn btn-sm btn-secondary" disabled>✓ Finalizada</button>`
                    }
                </td>
            `;
            tableBody.appendChild(row);
        });

        activeCount.innerText = `${activeTotal} Activas`;

    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}

async function procesarDevolucion(rentalId) {
    if (!confirm("¿Confirmas que el cliente ha entregado todos los equipos en buen estado?")) return;

    try {
        const response = await fetch(`${BASE_URL}/api/rentas/devolucion/${rentalId}`, {
            method: 'POST'
        });

        if (response.ok) {
            alert("Devolución exitosa. Los equipos ahora están 'Disponibles' en el catálogo.");
            loadRentals(); // Recargar tabla
        } else {
            const data = await response.json();
            alert("Error: " + data.error);
        }
    } catch (error) {
        alert("Error de conexión con el servidor.");
    }
}