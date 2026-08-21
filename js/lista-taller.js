/* ==========================================================================
   LISTA DE ASISTENCIA - Talleres (Mixología / Barismo)
   A diferencia de Día/Noche (búsqueda por código), aquí se muestran todos
   los nombres del taller de una vez -son grupos pequeños- y cada fila
   tiene su propio botón para marcar el ingreso.

   Dos formas de manejar cambios de último momento:
   - "Registrar sustituto": la persona registrada no llega y otra ocupa su
     mismo cupo (mismo código); no cambia el total de cupos del taller.
   - "Agregar Persona": alguien que NO estaba en la lista se suma como un
     cupo adicional, sin reemplazar a nadie. Se guarda con un ID propio
     (prefijo "extra-") en la misma colección, marcado con manual:true.

   El estado de ingreso se guarda en Firestore, así que se sincroniza en
   tiempo real entre todos los dispositivos que tengan esta lista abierta.
   ========================================================================== */

import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from './firebase-init.js';

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

function nuevoIdManual() {
    return `extra-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
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
    const agregarContainer = document.getElementById('lista-agregar-container');

    let confirmados = new Map(); // codigo -> { horaTexto, sustituto?, manual? }

    counterEl.textContent = 'Conectando...';

    function guardarIngreso(idDocumento, data) {
        return setDoc(doc(checkinsRef, idDocumento), {
            horaTexto: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: serverTimestamp(),
            ...data
        });
    }

    // Crea los 4 campos (primer apellido, segundo apellido, nombre, código)
    // que se reutilizan tanto para registrar un sustituto como para agregar
    // a una persona nueva.
    function crearCamposPersona() {
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

        return { campos, inputPrimerApellido, inputSegundoApellido, inputNombre, inputCodigo };
    }

    function leerPersona({ inputPrimerApellido, inputSegundoApellido, inputNombre, inputCodigo }) {
        return {
            primerApellido: inputPrimerApellido.value.trim(),
            segundoApellido: inputSegundoApellido.value.trim(),
            nombre: inputNombre.value.trim(),
            codigoProfesional: inputCodigo.value.trim()
        };
    }

    function personaCompleta(persona) {
        return !!(persona.primerApellido && persona.segundoApellido && persona.nombre && persona.codigoProfesional);
    }

    // --------------------------------------------------------------------
    // Sustituto: ocupa el cupo (código) de alguien que no llegó.
    // --------------------------------------------------------------------
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
            guardarIngreso(codigo, {}).catch((err) => {
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = 'Confirmar Ingreso';
                alert('No se pudo guardar el ingreso. Verifique su conexión e intente de nuevo.');
                console.error('Error guardando ingreso:', err);
            });
            // En éxito, el listener onSnapshot reconstruye esta fila con el badge.
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

        const { campos, ...inputsObj } = crearCamposPersona();
        const inputs = Object.values(inputsObj);

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
            const sustituto = leerPersona(inputsObj);
            if (!personaCompleta(sustituto)) return;

            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando...';
            inputs.forEach(i => { i.disabled = true; });
            guardarIngreso(codigo, { sustituto }).catch((err) => {
                btnGuardar.disabled = false;
                btnGuardar.textContent = 'Confirmar con Sustituto';
                inputs.forEach(i => { i.disabled = false; });
                alert('No se pudo guardar el ingreso. Verifique su conexión e intente de nuevo.');
                console.error('Error guardando ingreso:', err);
            });
            // En éxito, el listener onSnapshot reconstruye esta fila con el badge.
        });

        acciones.appendChild(btnGuardar);
        acciones.appendChild(btnCancelar);
        form.appendChild(campos);
        form.appendChild(acciones);
        return form;
    }

    // --------------------------------------------------------------------
    // Agregar Persona: cupo adicional, no reemplaza a nadie de la lista.
    // Vive fuera de #lista-items para no perder lo escrito si llega una
    // actualización de otro dispositivo mientras se está llenando.
    // --------------------------------------------------------------------
    function crearBotonAgregar() {
        const wrapper = document.createElement('div');
        wrapper.className = 'lista-agregar-wrapper';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lista-agregar-btn';
        btn.textContent = '+ Agregar Persona';
        btn.addEventListener('click', () => {
            wrapper.replaceWith(crearFormAgregar());
        });

        wrapper.appendChild(btn);
        return wrapper;
    }

    function crearFormAgregar() {
        const form = document.createElement('form');
        form.className = 'lista-sustituto-form lista-agregar-form';

        const { campos, ...inputsObj } = crearCamposPersona();
        const inputs = Object.values(inputsObj);

        const acciones = document.createElement('div');
        acciones.className = 'lista-sustituto-acciones';

        const btnGuardar = document.createElement('button');
        btnGuardar.type = 'submit';
        btnGuardar.className = 'lista-item-confirmar';
        btnGuardar.textContent = 'Agregar y Confirmar Ingreso';

        const btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.className = 'lista-item-sustituto-link';
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.addEventListener('click', () => {
            form.replaceWith(crearBotonAgregar());
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const persona = leerPersona(inputsObj);
            if (!personaCompleta(persona)) return;

            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando...';
            inputs.forEach(i => { i.disabled = true; });

            // A diferencia del sustituto (cuya fila se reconstruye sola con
            // el render de la lista), este formulario vive fuera de
            // #lista-items, así que hay que reactivarlo nosotros mismos
            // tanto si sale bien como si falla.
            guardarIngreso(nuevoIdManual(), { manual: true, ...persona })
                .then(() => {
                    form.reset();
                    btnGuardar.disabled = false;
                    btnGuardar.textContent = 'Agregar y Confirmar Ingreso';
                    inputs.forEach(i => { i.disabled = false; });
                    inputsObj.inputPrimerApellido.focus();
                })
                .catch((err) => {
                    btnGuardar.disabled = false;
                    btnGuardar.textContent = 'Agregar y Confirmar Ingreso';
                    inputs.forEach(i => { i.disabled = false; });
                    alert('No se pudo agregar a la persona. Verifique su conexión e intente de nuevo.');
                    console.error('Error agregando persona:', err);
                });
        });

        acciones.appendChild(btnGuardar);
        acciones.appendChild(btnCancelar);
        form.appendChild(campos);
        form.appendChild(acciones);
        return form;
    }

    agregarContainer.appendChild(crearBotonAgregar());

    // --------------------------------------------------------------------
    // Render
    // --------------------------------------------------------------------
    function render() {
        const codigosDelPadron = new Set(dataset.map(a => normalizarCodigo(a.codigo)));
        let confirmadosDelPadron = 0;
        const manuales = [];

        confirmados.forEach((data, id) => {
            if (codigosDelPadron.has(id)) {
                confirmadosDelPadron += 1;
            } else {
                manuales.push([id, data]);
            }
        });

        counterEl.textContent = manuales.length > 0
            ? `${confirmadosDelPadron} de ${dataset.length} confirmados (+${manuales.length} adicional${manuales.length === 1 ? '' : 'es'})`
            : `${confirmadosDelPadron} de ${dataset.length} confirmados`;

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

        // Personas agregadas manualmente: cupos adicionales, no del padrón.
        // El ID ("extra-<hora-en-ms>-...") ya viene en orden cronológico.
        manuales
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([id, data]) => {
                const row = document.createElement('div');
                row.className = 'lista-item';

                const info = document.createElement('div');
                info.className = 'lista-item-info';
                info.innerHTML = `
                    <span class="lista-item-nombre">${escapeHtml(data.primerApellido)} ${escapeHtml(data.segundoApellido)}, ${escapeHtml(data.nombre)}</span>
                    <span class="lista-item-codigo">Código ${escapeHtml(data.codigoProfesional)} <span class="lista-item-manual-etiqueta">· Persona adicional</span></span>
                `;
                row.appendChild(info);

                const badge = document.createElement('span');
                badge.className = 'lista-item-confirmado manual';
                badge.innerHTML = `
                    <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>${data.horaTexto}</span>
                `;
                row.appendChild(badge);

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
