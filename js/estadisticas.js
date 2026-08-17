/* ==========================================================================
   ESTADÍSTICAS - Lógica en tiempo real
   Escucha las colecciones checkins_dia y checkins_noche en Firestore y, por
   cada check-in confirmado, busca en el padrón local (data/asistentes.js)
   el total de personas de ese código para sumarlo. Se actualiza solo, sin
   recargar la página, cada vez que alguien confirma un check-in desde
   cualquier punto de registro.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore,
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        diaMedicos: document.getElementById('stat-dia-medicos'),
        diaPersonas: document.getElementById('stat-dia-personas'),
        nocheMedicos: document.getElementById('stat-noche-medicos'),
        nochePersonas: document.getElementById('stat-noche-personas'),
        totalMedicos: document.getElementById('stat-total-medicos'),
        totalPersonas: document.getElementById('stat-total-personas')
    };

    const stats = {
        dia: { medicos: 0, personas: 0 },
        noche: { medicos: 0, personas: 0 }
    };

    function calcularTotales(snapshot, dataset) {
        let medicos = 0;
        let personas = 0;

        snapshot.forEach(docSnap => {
            const codigo = docSnap.id;
            const asistente = dataset.find(a => a.codigo.toUpperCase() === codigo);
            medicos += 1;
            personas += asistente ? Number(asistente.totalPersonas) || 0 : 0;
        });

        return { medicos, personas };
    }

    function render() {
        elements.diaMedicos.textContent = stats.dia.medicos;
        elements.diaPersonas.textContent = stats.dia.personas;
        elements.nocheMedicos.textContent = stats.noche.medicos;
        elements.nochePersonas.textContent = stats.noche.personas;
        elements.totalMedicos.textContent = stats.dia.medicos + stats.noche.medicos;
        elements.totalPersonas.textContent = stats.dia.personas + stats.noche.personas;
    }

    onSnapshot(collection(db, 'checkins_dia'), (snapshot) => {
        stats.dia = calcularTotales(snapshot, window.ASISTENTES_DIA);
        render();
    }, (error) => {
        console.error('Error escuchando checkins_dia:', error);
    });

    onSnapshot(collection(db, 'checkins_noche'), (snapshot) => {
        stats.noche = calcularTotales(snapshot, window.ASISTENTES_NOCHE);
        render();
    }, (error) => {
        console.error('Error escuchando checkins_noche:', error);
    });
});
