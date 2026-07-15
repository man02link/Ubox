const GYM_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    fetchPlans();
    fetchClients();
    const form = document.getElementById('client-form');
    if (form) form.addEventListener('submit', addClient);
});

async function fetchPlans() {
    try {
        const res = await fetch(`${GYM_BASE_URL}/gym/plans`);
        const data = await res.json();
        const select = document.getElementById('c-plan');
        data.plans.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} (${p.duration_days} días)`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Error al cargar planes", e);
    }
}

async function fetchClients() {
    try {
        const res = await fetch(`${GYM_BASE_URL}/gym/clients`);
        const data = await res.json();
        renderTable(data.clients);
    } catch (e) {
        document.getElementById('table-container').innerHTML = '<p class="text-danger">Error conectando con el servidor.</p>';
    }
}

function renderTable(clients) {
    if (!clients || clients.length === 0) {
        document.getElementById('table-container').innerHTML = '<p class="mt-3 text-muted">Aún no hay clientes registrados.</p>';
        return;
    }
    let html = `<table class="data-table">
        <tr>
            <th>Nombre Completo</th>
            <th>Teléfono</th>
            <th>Membresía</th>
            <th>Fecha Inscripción</th>
            <th style="width:100px; text-align:center;">Acciones</th>
        </tr>`;
    clients.forEach(c => {
        html += `<tr>
            <td><strong>${c.name} ${c.last_name || ''}</strong></td>
            <td>${c.phone}</td>
            <td><span class="badge bg-primary">${c.plan_name || 'Ninguno'}</span></td>
            <td>${new Date(c.enrollment_date).toLocaleDateString()}</td>
            <td style="text-align:center;"><button class="btn-delete" onclick="deleteClient('${c.id}')">🗑️ Eliminar</button></td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('table-container').innerHTML = html;
}

async function addClient(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('c-name').value,
        last_name: document.getElementById('c-lastname').value,
        phone: document.getElementById('c-phone').value,
        plan_id: document.getElementById('c-plan').value
    };

    document.querySelector('button[type="submit"]').textContent = "Guardando...";
    try {
        const res = await fetch(`${GYM_BASE_URL}/gym/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById('client-form').reset();
            fetchClients();
        } else {
            alert("Error al registrar cliente: Datos inválidos o conexión fallida.");
        }
    } catch (e) {
        alert("Error de red.");
    } finally {
        document.querySelector('button[type="submit"]').textContent = "Guardar Cliente";
    }
}

window.deleteClient = async function (id) {
    if (!confirm("¿Estás seguro de que deseas eliminar permanentemente a este cliente?")) return;
    try {
        await fetch(`${GYM_BASE_URL}/gym/clients/${id}`, { method: 'DELETE' });
        fetchClients();
    } catch (e) {
        alert("Error al intentar eliminar.");
    }
}