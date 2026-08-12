/* ==========================================================================
   LISTA DE ASISTENCIA - Interactive Script
   Persists attendees and event info in localStorage.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'asistencia_lista';
    const EVENT_KEY = 'asistencia_evento';

    const tbody = document.getElementById('attendee-tbody');
    const emptyState = document.getElementById('empty-state');
    const table = document.querySelector('.attendee-table');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const statTotal = document.getElementById('stat-total');
    const statPresentes = document.getElementById('stat-presentes');
    const statAusentes = document.getElementById('stat-ausentes');
    const heroEventName = document.getElementById('hero-event-name');
    const heroEventMeta = document.getElementById('hero-event-meta').querySelector('span');

    let attendees = loadAttendees();
    let currentFilter = 'todos';
    let currentSearch = '';

    // --------------------------------------------------------------------
    // Persistence helpers
    // --------------------------------------------------------------------
    function loadAttendees() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveAttendees() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(attendees));
    }

    function loadEvent() {
        try {
            const raw = localStorage.getItem(EVENT_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveEvent(data) {
        localStorage.setItem(EVENT_KEY, JSON.stringify(data));
    }

    // --------------------------------------------------------------------
    // Event configuration
    // --------------------------------------------------------------------
    function renderEvent() {
        const evt = loadEvent();
        document.getElementById('event-nombre').value = evt.nombre || '';
        document.getElementById('event-fecha').value = evt.fecha || '';
        document.getElementById('event-lugar').value = evt.lugar || '';

        heroEventName.textContent = evt.nombre || 'Registro rápido de participantes para tu evento';

        const metaParts = [];
        if (evt.fecha) {
            const [y, m, d] = evt.fecha.split('-');
            if (y && m && d) metaParts.push(`${d}/${m}/${y}`);
        }
        if (evt.lugar) metaParts.push(evt.lugar);
        heroEventMeta.textContent = metaParts.length ? metaParts.join(' · ') : 'Configura tu evento abajo';
    }

    document.getElementById('event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            nombre: document.getElementById('event-nombre').value.trim(),
            fecha: document.getElementById('event-fecha').value,
            lugar: document.getElementById('event-lugar').value.trim()
        };
        saveEvent(data);
        renderEvent();
    });

    renderEvent();

    // --------------------------------------------------------------------
    // Attendee CRUD
    // --------------------------------------------------------------------
    function addAttendee(nombre, identificacion, grupo) {
        attendees.push({
            id: Date.now() + Math.random().toString(16).slice(2),
            nombre,
            identificacion,
            grupo,
            presente: true,
            hora: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
        });
        saveAttendees();
        render();
    }

    function toggleStatus(id) {
        const attendee = attendees.find(a => a.id === id);
        if (attendee) {
            attendee.presente = !attendee.presente;
            saveAttendees();
            render();
        }
    }

    function deleteAttendee(id) {
        attendees = attendees.filter(a => a.id !== id);
        saveAttendees();
        render();
    }

    document.getElementById('attendee-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const nombreInput = document.getElementById('attendee-nombre');
        const idInput = document.getElementById('attendee-id');
        const grupoInput = document.getElementById('attendee-grupo');

        const nombre = nombreInput.value.trim();
        if (!nombre) return;

        addAttendee(nombre, idInput.value.trim(), grupoInput.value.trim());

        nombreInput.value = '';
        idInput.value = '';
        grupoInput.value = '';
        nombreInput.focus();
    });

    // --------------------------------------------------------------------
    // Rendering
    // --------------------------------------------------------------------
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function getFilteredAttendees() {
        return attendees.filter(a => {
            if (currentFilter === 'presentes' && !a.presente) return false;
            if (currentFilter === 'ausentes' && a.presente) return false;

            if (currentSearch) {
                const haystack = `${a.nombre} ${a.identificacion} ${a.grupo}`.toLowerCase();
                if (!haystack.includes(currentSearch)) return false;
            }
            return true;
        });
    }

    function render() {
        const filtered = getFilteredAttendees();

        tbody.innerHTML = filtered.map(a => `
            <tr data-id="${a.id}">
                <td>${escapeHtml(a.nombre)}</td>
                <td>${escapeHtml(a.identificacion) || '—'}</td>
                <td>${escapeHtml(a.grupo) || '—'}</td>
                <td>${a.hora}</td>
                <td>
                    <button class="status-pill ${a.presente ? 'presente' : 'ausente'}" data-action="toggle" data-id="${a.id}">
                        ${a.presente ? 'Presente' : 'Ausente'}
                    </button>
                </td>
                <td>
                    <button class="delete-btn" data-action="delete" data-id="${a.id}" aria-label="Eliminar">
                        <svg class="icon-svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');

        const hasAny = attendees.length > 0;
        const hasFiltered = filtered.length > 0;

        table.classList.toggle('hidden', !hasFiltered);
        emptyState.classList.toggle('visible', !hasFiltered);
        emptyState.textContent = hasAny
            ? 'Ningún asistente coincide con la búsqueda o el filtro seleccionado.'
            : 'Aún no hay personas registradas. Agrega la primera desde el formulario de arriba.';

        updateStats();
    }

    function updateStats() {
        const total = attendees.length;
        const presentes = attendees.filter(a => a.presente).length;
        const ausentes = total - presentes;

        statTotal.textContent = total;
        statPresentes.textContent = presentes;
        statAusentes.textContent = ausentes;
    }

    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        if (btn.dataset.action === 'toggle') toggleStatus(id);
        if (btn.dataset.action === 'delete') deleteAttendee(id);
    });

    // --------------------------------------------------------------------
    // Search & filters
    // --------------------------------------------------------------------
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim().toLowerCase();
        render();
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            render();
        });
    });

    // --------------------------------------------------------------------
    // Export & clear
    // --------------------------------------------------------------------
    document.getElementById('export-btn').addEventListener('click', () => {
        if (attendees.length === 0) return;

        const header = ['Nombre', 'Cedula/Carne', 'Grupo', 'Hora', 'Estado'];
        const rows = attendees.map(a => [
            a.nombre,
            a.identificacion,
            a.grupo,
            a.hora,
            a.presente ? 'Presente' : 'Ausente'
        ]);

        const csv = [header, ...rows]
            .map(row => row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'lista-de-asistencia.csv';
        link.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
        if (attendees.length === 0) return;
        if (confirm('¿Seguro que deseas vaciar toda la lista de asistencia? Esta acción no se puede deshacer.')) {
            attendees = [];
            saveAttendees();
            render();
        }
    });

    // --------------------------------------------------------------------
    // Button press micro-interaction
    // --------------------------------------------------------------------
    document.addEventListener('mousedown', (e) => {
        const el = e.target.closest('.btn');
        if (el) el.style.transform = 'scale(0.96)';
    });
    ['mouseup', 'mouseleave'].forEach(evt => {
        document.addEventListener(evt, (e) => {
            const el = e.target.closest ? e.target.closest('.btn') : null;
            if (el) el.style.transform = '';
        });
    });

    render();
});
