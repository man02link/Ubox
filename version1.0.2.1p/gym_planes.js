const GYM_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    fetchPlans();
    const form = document.getElementById('plan-form');
    if (form) form.addEventListener('submit', addPlan);
});

async function fetchPlans() {
    try {
        const res = await fetch(`${GYM_BASE_URL}/gym/plans`);
        const data = await res.json();
        renderTable(data.plans);
    } catch (e) {
        document.getElementById('table-container').innerHTML = '<p class="text-danger">Error conectando con el servidor.</p>';
    }
}

function renderTable(plans) {
    if (!plans || plans.length === 0) {
        document.getElementById('table-container').innerHTML = '<p class="mt-3 text-muted">Aún no hay membresías creadas.</p>';
        return;
    }
    let html = `<table class="data-table">
        <tr>
            <th>Nombre del Plan</th>
            <th>Vigencia</th>
            <th>Fecha de Creación</th>
            <th style="width:100px; text-align:center;">Acciones</th>
        </tr>`;
    plans.forEach(p => {
        html += `<tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.duration_days} días</td>
            <td>${new Date(p.createdAt).toLocaleDateString()}</td>
            <td style="text-align:center;"><button class="btn-delete" onclick="deletePlan('${p.id}')">🗑️ Descatalogar</button></td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('table-container').innerHTML = html;
}

async function addPlan(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('p-name').value,
        duration_days: document.getElementById('p-duration').value
    };

    document.querySelector('button[type="submit"]').textContent = "Guardando...";
    try {
        const res = await fetch(`${GYM_BASE_URL}/gym/plans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById('plan-form').reset();
            fetchPlans();
        } else {
            alert("Error al registrar plan.");
        }
    } catch (e) {
        alert("Error de red.");
    } finally {
        document.querySelector('button[type="submit"]').textContent = "Guardar Plan";
    }
}

window.deletePlan = async function (id) {
    if (!confirm("Advertencia: Eliminar un plan borrará su referencia. ¿Deseas continuar?")) return;
    try {
        await fetch(`${GYM_BASE_URL}/gym/plans/${id}`, { method: 'DELETE' });
        fetchPlans();
    } catch (e) {
        alert("Error al intentar eliminar.");
    }
}