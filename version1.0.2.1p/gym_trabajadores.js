const GYM_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    fetchWorkers();
    const form = document.getElementById('worker-form');
    if (form) form.addEventListener('submit', addWorker);
});

async function fetchWorkers() {
    try {
        const res = await fetch(`${GYM_BASE_URL}/gym/workers`);
        const data = await res.json();
        renderTable(data.workers);
    } catch (e) {
        document.getElementById('table-container').innerHTML = '<p class="text-danger">Error conectando con el servidor.</p>';
    }
}

function renderTable(workers) {
    if (!workers || workers.length === 0) {
        document.getElementById('table-container').innerHTML = '<p class="mt-3 text-muted">Aún no hay trabajadores registrados.</p>';
        return;
    }
    let html = `<table class="data-table">
        <tr>
            <th>Nombre Completo</th>
            <th>Teléfono</th>
            <th>Sueldo</th>
            <th>Fecha Registro</th>
            <th style="width:100px; text-align:center;">Acciones</th>
        </tr>`;
    workers.forEach(w => {
        html += `<tr>
            <td><strong>${w.name} ${w.last_name || ''}</strong></td>
            <td>${w.phone}</td>
            <td><span class="text-success">$${w.salary.toFixed(2)}</span></td>
            <td>${new Date(w.createdAt).toLocaleDateString()}</td>
            <td style="text-align:center;"><button class="btn-delete" onclick="deleteWorker('${w.id}')">🗑️ Despedir</button></td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('table-container').innerHTML = html;
}

async function addWorker(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('w-name').value,
        last_name: document.getElementById('w-lastname').value,
        phone: document.getElementById('w-phone').value,
        salary: document.getElementById('w-salary').value
    };

    document.querySelector('button[type="submit"]').textContent = "Guardando...";
    try {
        const res = await fetch(`${GYM_BASE_URL}/gym/workers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById('worker-form').reset();
            fetchWorkers();
        } else {
            alert("Error al registrar trabajador.");
        }
    } catch (e) {
        alert("Error de red.");
    } finally {
        document.querySelector('button[type="submit"]').textContent = "Guardar Trabajador";
    }
}

window.deleteWorker = async function (id) {
    if (!confirm("¿Deseas dar de baja a este trabajador de manera permanente?")) return;
    try {
        await fetch(`${GYM_BASE_URL}/gym/workers/${id}`, { method: 'DELETE' });
        fetchWorkers();
    } catch (e) {
        alert("Error al intentar eliminar.");
    }
}