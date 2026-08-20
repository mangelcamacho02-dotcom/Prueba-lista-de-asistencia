/* ==========================================================================
   LISTA DE ASISTENCIA - Talleres (Mixología / Barismo)
   A diferencia de Día/Noche (búsqueda por código), aquí se muestran todos
   los nombres del taller de una vez -son grupos pequeños de 25 personas- y
   cada fila tiene su propio botón para marcar el ingreso.

   Si la persona registrada no llega, se puede confirmar el cupo con un
   sustituto: se guarda el nombre de quien realmente entró, en el mismo
   cupo (mismo código) de quien no llegó, para no alterar el total de
   cupos del taller.

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

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

    let confirmados = new Map(); // codigo -> { horaTexto, sustituto? }

    counterEl.textContent = 'Conectando...';

    function guardarIngreso(codigo, data, onError) {
        setDoc(doc(checkinsRef, codigo), {
            horaTexto: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: serverTimestamp(),
            ...data
        }).catch((err) => {
            onError();
            alert('No se pudo guardar el ingreso. Verifique su conexión e intente de nuevo.');
            console.error('Error guardando ingreso:', err);
        });
        // El listener onSnapshot vuelve a dibujar la fila cuando se confirme.
    }

    function crearAccionPendiente(codigo, nombreOriginal) {
        const wrapper = document.createElement('div');
        wrapper.className = 'lista-item-accion';

        const btnConfirmar = document.createElement('button');
        btnConfirmar.type = 'button';
        btnConfirmar.className = 'lista-item-confirmar';
        btnConfirmar.textContent = 'Confirmar Ingreso';
        btnConfirmar.addEventListener('click', () => {
            btnConfirmar.disabled = true;
            btnConfirmar.textContent = 'Guardando...';
            guardarIngreso(codigo, {}, () => {
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = 'Confirmar Ingreso';
            });
        });

        const linkSustituto = document.createElement('button');
        linkSustituto.type = 'button';
        linkSustituto.className = 'lista-item-sustituto-link';
        linkSustituto.textContent = 'Registrar sustituto';
        linkSustituto.addEventListener('click', () => {
            wrapper.replaceWith(crearFormSustituto(codigo, nombreOriginal));
        });

        wrapper.appendChild(btnConfirmar);
        wrapper.appendChild(linkSustituto);
        return wrapper;
    }

    function crearFormSustituto(codigo, nombreOriginal) {
        const form = document.createElement('form');
        form.className = 'lista-sustituto-form';

        const campos = document.createElement('div');
        campos.className = 'lista-sustituto-campos';

        const inputPrimerApellido = document.createElement('input');
        inputPrimerApellido.type = 'text';
        inputPrimerApellido.placeholder = 'Primer apellido';
        inputPrimerApellido.required = true;
        inputPrimerApellido.autocomplete = 'off';

        const inputSegundoApellido = document.createElement('input');
        inputSegundoApellido.type = 'text';
        inputSegundoApellido.placeholder = 'Segundo apellido';
        inputSegundoApellido.required = true;
        inputSegundoApellido.autocomplete = 'off';

        const inputNombre = document.createElement('input');
        inputNombre.type = 'text';
        inputNombre.placeholder = 'Nombre';
        inputNombre.required = true;
        inputNombre.autocomplete = 'off';

        const inputCodigo = document.createElement('input');
        inputCodigo.type = 'text';
        inputCodigo.inputMode = 'numeric';
        inputCodigo.placeholder = 'Código profesional';
        inputCodigo.required = true;
        inputCodigo.autocomplete = 'off';

        campos.appendChild(inputPrimerApellido);
        campos.appendChild(inputSegundoApellido);
        campos.appendChild(inputNombre);
        campos.appendChild(inputCodigo);

        const acciones = document.createElement('div');
        acciones.className = 'lista-sustituto-acciones';

        const btnGuardar = document.createElement('button');
        btnGuardar.type = 'submit';
        btnGuardar.className = 'lista-item-confirmar';
        btnGuardar.textContent = 'Confirmar con Sustituto';

        const btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.className = 'lista-item-sustituto-link';
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.addEventListener('click', () => {
            form.replaceWith(crearAccionPendiente(codigo, nombreOriginal));
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const sustituto = {
                primerApellido: inputPrimerApellido.value.trim(),
                segundoApellido: inputSegundoApellido.value.trim(),
                nombre: inputNombre.value.trim(),
                codigoProfesional: inputCodigo.value.trim()
            };
            if (!sustituto.primerApellido || !sustituto.segundoApellido || !sustituto.nombre || !sustituto.codigoProfesional) {
                return;
            }
            const inputs = [inputPrimerApellido, inputSegundoApellido, inputNombre, inputCodigo];
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando...';
            inputs.forEach(i => { i.disabled = true; });
            guardarIngreso(codigo, { sustituto }, () => {
                btnGuardar.disabled = false;
                btnGuardar.textContent = 'Confirmar con Sustituto';
                inputs.forEach(i => { i.disabled = false; });
            });
        });

        acciones.appendChild(btnGuardar);
        acciones.appendChild(btnCancelar);
        form.appendChild(campos);
        form.appendChild(acciones);
        return form;
    }

    function render() {
        counterEl.textContent = `${confirmados.size} de ${dataset.length} confirmados`;

        listaItems.innerHTML = '';
        dataset.forEach((asistente) => {
            const codigo = normalizarCodigo(asistente.codigo);
            const existing = confirmados.get(codigo);
            const nombreOriginal = `${asistente.primerApellido} ${asistente.segundoApellido}, ${asistente.nombre}`;

            const row = document.createElement('div');
            row.className = 'lista-item';

            const info = document.createElement('div');
            info.className = 'lista-item-info';
            info.innerHTML = `
                <span class="lista-item-nombre">${nombreOriginal}</span>
                <span class="lista-item-codigo">Código ${codigo}</span>
            `;
            row.appendChild(info);

            if (existing) {
                const badge = document.createElement('span');
                badge.className = existing.sustituto ? 'lista-item-confirmado sustituto' : 'lista-item-confirmado';
                let textoSustituto = '';
                if (existing.sustituto) {
                    const s = existing.sustituto;
                    textoSustituto = `<span class="lista-item-sustituto-nombre">Sustituto: ${escapeHtml(s.primerApellido)} ${escapeHtml(s.segundoApellido)}, ${escapeHtml(s.nombre)} (Cód. ${escapeHtml(s.codigoProfesional)})</span>`;
                }
                badge.innerHTML = `
                    <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span class="lista-item-confirmado-texto">
                        <span>${existing.horaTexto}</span>
                        ${textoSustituto}
                    </span>
                `;
                row.appendChild(badge);
            } else {
                row.appendChild(crearAccionPendiente(codigo, nombreOriginal));
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
