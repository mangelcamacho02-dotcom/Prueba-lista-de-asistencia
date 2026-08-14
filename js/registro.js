/* ==========================================================================
   REGISTRO / CHECK-IN - Lógica de consulta por código
   Funciona en registro-dia.html y registro-noche.html.
   El atributo data-actividad en <body> ("dia" o "noche") decide qué lista
   de códigos usar y en qué colección de Firestore se guarda el check-in.

   El conteo y el estado de check-in se guardan en Firestore (no en
   localStorage), así que se sincronizan en tiempo real entre todos los
   dispositivos/puntos de registro conectados.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const actividad = document.body.dataset.actividad; // "dia" | "noche"
    const dataset = actividad === 'dia' ? window.ASISTENTES_DIA : window.ASISTENTES_NOCHE;
    const checkinsRef = collection(db, `checkins_${actividad}`);

    const form = document.getElementById('lookup-form');
    const codeInput = document.getElementById('codigo-input');
    const errorBox = document.getElementById('lookup-error');
    const resultCard = document.getElementById('result-card');
    const counterEl = document.getElementById('lookup-counter');
    const resetBtn = document.getElementById('lookup-reset-btn');
    const checkinActions = document.getElementById('checkin-actions');

    const fields = {
        primerApellido: document.getElementById('result-primer-apellido'),
        segundoApellido: document.getElementById('result-segundo-apellido'),
        nombre: document.getElementById('result-nombre'),
        totalPersonas: document.getElementById('result-total-personas'),
        concierto: document.getElementById('result-concierto')
    };

    let confirmados = new Map(); // codigo -> { horaTexto }
    let currentCodigo = null;

    counterEl.textContent = 'Conectando...';

    // Escucha en tiempo real: cualquier check-in confirmado desde cualquier
    // dispositivo actualiza el contador y, si coincide con el código que se
    // está viendo en pantalla, también el estado del botón/banner.
    onSnapshot(checkinsRef, (snapshot) => {
        confirmados = new Map();
        snapshot.forEach(docSnap => confirmados.set(docSnap.id, docSnap.data()));
        counterEl.textContent = `${confirmados.size} de ${dataset.length} confirmados`;

        if (currentCodigo) {
            renderCheckinState(currentCodigo);
        }
    }, (error) => {
        counterEl.textContent = 'Sin conexión con la base de datos en tiempo real.';
        console.error('Error escuchando Firestore:', error);
    });

    function findByCodigo(codigo) {
        const normalized = codigo.trim().toUpperCase();
        return dataset.find(a => a.codigo.toUpperCase() === normalized);
    }

    function renderCheckinState(codigo) {
        checkinActions.innerHTML = '';
        const existing = confirmados.get(codigo);

        if (existing) {
            const banner = document.createElement('div');
            banner.className = 'checkin-confirmed-banner';
            banner.innerHTML = `
                <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Check-in confirmado a las ${existing.horaTexto}</span>
            `;
            checkinActions.appendChild(banner);
        } else {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-orange checkin-confirm-btn';
            btn.textContent = 'Confirmar Check-in';
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = 'Guardando...';
                try {
                    await setDoc(doc(checkinsRef, codigo), {
                        horaTexto: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
                        timestamp: serverTimestamp()
                    });
                    // El listener onSnapshot actualiza la pantalla automáticamente.
                } catch (err) {
                    btn.disabled = false;
                    btn.textContent = 'Confirmar Check-in';
                    alert('No se pudo guardar el check-in. Verifique su conexión e intente de nuevo.');
                    console.error('Error guardando check-in:', err);
                }
            });
            checkinActions.appendChild(btn);
        }
    }

    function showResult(asistente) {
        errorBox.classList.remove('visible');
        currentCodigo = asistente.codigo.toUpperCase();

        fields.primerApellido.textContent = asistente.primerApellido;
        fields.segundoApellido.textContent = asistente.segundoApellido;
        fields.nombre.textContent = asistente.nombre;
        fields.totalPersonas.textContent = asistente.totalPersonas;
        fields.concierto.innerHTML = asistente.concierto
            ? '<span class="concierto-badge si">Sí</span>'
            : '<span class="concierto-badge no">No</span>';

        renderCheckinState(currentCodigo);
        resultCard.classList.add('visible');
    }

    function showError(message) {
        currentCodigo = null;
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
        currentCodigo = null;
        resultCard.classList.remove('visible');
        errorBox.classList.remove('visible');
        codeInput.focus();
    });
});
