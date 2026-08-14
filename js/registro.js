/* ==========================================================================
   REGISTRO / CHECK-IN - Lógica de consulta por código
   Funciona en registro-dia.html y registro-noche.html.
   El atributo data-actividad en <body> ("dia" o "noche") decide qué lista
   de códigos usar y en qué llave de localStorage se guarda el check-in.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const actividad = document.body.dataset.actividad; // "dia" | "noche"
    const dataset = actividad === 'dia' ? window.ASISTENTES_DIA : window.ASISTENTES_NOCHE;
    const STORAGE_KEY = `checkin_${actividad}`;

    const form = document.getElementById('lookup-form');
    const codeInput = document.getElementById('codigo-input');
    const errorBox = document.getElementById('lookup-error');
    const resultCard = document.getElementById('result-card');
    const counterEl = document.getElementById('lookup-counter');
    const resetBtn = document.getElementById('lookup-reset-btn');

    const fields = {
        primerApellido: document.getElementById('result-primer-apellido'),
        segundoApellido: document.getElementById('result-segundo-apellido'),
        nombre: document.getElementById('result-nombre'),
        totalPersonas: document.getElementById('result-total-personas'),
        concierto: document.getElementById('result-concierto')
    };

    const checkinActions = document.getElementById('checkin-actions');

    function loadCheckins() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveCheckins(checkins) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(checkins));
    }

    function updateCounter() {
        const checkins = loadCheckins();
        const confirmados = Object.keys(checkins).length;
        counterEl.textContent = `${confirmados} de ${dataset.length} confirmados`;
    }

    function findByCodigo(codigo) {
        const normalized = codigo.trim().toUpperCase();
        return dataset.find(a => a.codigo.toUpperCase() === normalized);
    }

    function renderCheckinState(codigo) {
        const checkins = loadCheckins();
        const existing = checkins[codigo];

        checkinActions.innerHTML = '';

        if (existing) {
            const banner = document.createElement('div');
            banner.className = 'checkin-confirmed-banner';
            banner.innerHTML = `
                <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Check-in confirmado a las ${existing.hora}</span>
            `;
            checkinActions.appendChild(banner);
        } else {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-orange checkin-confirm-btn';
            btn.textContent = 'Confirmar Check-in';
            btn.addEventListener('click', () => {
                const updated = loadCheckins();
                updated[codigo] = {
                    hora: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
                };
                saveCheckins(updated);
                renderCheckinState(codigo);
                updateCounter();
            });
            checkinActions.appendChild(btn);
        }
    }

    function showResult(asistente) {
        errorBox.classList.remove('visible');

        fields.primerApellido.textContent = asistente.primerApellido;
        fields.segundoApellido.textContent = asistente.segundoApellido;
        fields.nombre.textContent = asistente.nombre;
        fields.totalPersonas.textContent = asistente.totalPersonas;
        fields.concierto.innerHTML = asistente.concierto
            ? '<span class="concierto-badge si">Sí</span>'
            : '<span class="concierto-badge no">No</span>';

        renderCheckinState(asistente.codigo.toUpperCase());
        resultCard.classList.add('visible');
    }

    function showError(message) {
        resultCard.classList.remove('visible');
        errorBox.textContent = message;
        errorBox.classList.add('visible');
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const codigo = codeInput.value.trim();
        if (!codigo) return;

        const asistente = findByCodigo(codigo);
        if (asistente) {
            showResult(asistente);
        } else {
            showError('Código no encontrado. Verifique e intente de nuevo.');
        }
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultCard.classList.remove('visible');
        errorBox.classList.remove('visible');
        codeInput.focus();
    });

    updateCounter();
});
