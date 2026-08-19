/* ==========================================================================
   LISTA DE ASISTENCIA - Talleres (Mixología / Barismo)
   A diferencia de Día/Noche (búsqueda por código), aquí se muestran todos
   los nombres del taller de una vez -son grupos pequeños de 25 personas- y
   cada fila tiene su propio botón para marcar el ingreso.

   El estado de ingreso se guarda en Firestore, así que se sincroniza en
   tiempo real entre todos los dispositivos que tengan esta lista abierta.
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

const ACTIVIDAD_CONFIG = {
    mixologia: { roster: () => window.ASISTENTES_MIXOLOGIA, coleccion: 'checkins_mixologia' },
    barismo: { roster: () => window.ASISTENTES_BARISMO, coleccion: 'checkins_barismo' }
};

function normalizarCodigo(valor) {
    return String(valor || '').replace(/\D/g, '');
}

document.addEventListener('DOMContentLoaded', () => {
    const actividad = document.body.dataset.actividad;
    const config = ACTIVIDAD_CONFIG[actividad];
    const checkinsRef = collection(db, config.coleccion);

    // Orden alfabético por apellido, como una lista de asistencia impresa.
    const dataset = config.roster().slice().sort((a, b) => {
        return `${a.primerApellido} ${a.segundoApellido} ${a.nombre}`
            .localeCompare(`${b.primerApellido} ${b.segundoApellido} ${b.nombre}`, 'es');
    });

    const counterEl = document.getElementById('lista-counter');
    const listaItems = document.getElementById('lista-items');

    let confirmados = new Map(); // codigo -> { horaTexto }

    counterEl.textContent = 'Conectando...';

    function confirmarIngreso(codigo, btn) {
        btn.disabled = true;
        btn.textContent = 'Guardando...';
        setDoc(doc(checkinsRef, codigo), {
            horaTexto: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: serverTimestamp()
        }).catch((err) => {
            btn.disabled = false;
            btn.textContent = 'Confirmar Ingreso';
            alert('No se pudo guardar el ingreso. Verifique su conexión e intente de nuevo.');
            console.error('Error guardando ingreso:', err);
        });
        // El listener onSnapshot vuelve a dibujar la fila cuando se confirme.
    }

    function render() {
        counterEl.textContent = `${confirmados.size} de ${dataset.length} confirmados`;

        listaItems.innerHTML = '';
        dataset.forEach((asistente) => {
            const codigo = normalizarCodigo(asistente.codigo);
            const existing = confirmados.get(codigo);

            const row = document.createElement('div');
            row.className = 'lista-item';

            const info = document.createElement('div');
            info.className = 'lista-item-info';
            info.innerHTML = `
                <span class="lista-item-nombre">${asistente.primerApellido} ${asistente.segundoApellido}, ${asistente.nombre}</span>
                <span class="lista-item-codigo">Código ${codigo}</span>
            `;
            row.appendChild(info);

            if (existing) {
                const badge = document.createElement('span');
                badge.className = 'lista-item-confirmado';
                badge.innerHTML = `
                    <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>${existing.horaTexto}</span>
                `;
                row.appendChild(badge);
            } else {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'lista-item-confirmar';
                btn.textContent = 'Confirmar Ingreso';
                btn.addEventListener('click', () => confirmarIngreso(codigo, btn));
                row.appendChild(btn);
            }

            listaItems.appendChild(row);
        });
    }

    onSnapshot(checkinsRef, (snapshot) => {
        confirmados = new Map();
        snapshot.forEach(docSnap => confirmados.set(docSnap.id, docSnap.data()));
        render();
    }, (error) => {
        counterEl.textContent = 'Sin conexión con la base de datos en tiempo real.';
        console.error('Error escuchando Firestore:', error);
    });
});
