/* ==========================================================================
   ESTADÍSTICAS - Lógica en tiempo real + exportación a Excel
   Escucha las colecciones checkins_dia, checkins_noche, checkins_mixologia
   y checkins_barismo en Firestore y, por cada check-in confirmado, busca en
   el padrón local (data/asistentes.js) los datos de esa persona.

   Importante: una misma persona puede asistir a Día, a Noche, o a ambas
   actividades principales. Los conteos "Únicos"/"Ambas"/"Solo Día"/
   "Solo Noche" evitan contar dos veces a quien asistió a las dos. Los
   talleres (Mixología/Barismo) son individuales y se cuentan aparte.
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

function normalizarCodigo(valor) {
    return String(valor || '').replace(/\D/g, '');
}

function buscarEnRoster(codigo, roster) {
    return (roster || []).find(a => normalizarCodigo(a.codigo) === codigo);
}

function buscarEnDiaONoche(codigo) {
    return buscarEnRoster(codigo, window.ASISTENTES_DIA) || buscarEnRoster(codigo, window.ASISTENTES_NOCHE);
}

document.addEventListener('DOMContentLoaded', () => {
    const el = {
        diaMedicos: document.getElementById('stat-dia-medicos'),
        diaPersonas: document.getElementById('stat-dia-personas'),
        nocheMedicos: document.getElementById('stat-noche-medicos'),
        nochePersonas: document.getElementById('stat-noche-personas'),
        mixologiaMedicos: document.getElementById('stat-mixologia-medicos'),
        barismoMedicos: document.getElementById('stat-barismo-medicos'),
        unicoMedicos: document.getElementById('stat-unico-medicos'),
        unicoPersonas: document.getElementById('stat-unico-personas'),
        ambas: document.getElementById('stat-ambas'),
        soloDia: document.getElementById('stat-solo-dia'),
        soloNoche: document.getElementById('stat-solo-noche')
    };
    const exportBtn = document.getElementById('export-btn');
    const exportBtnLabel = document.getElementById('export-btn-label');

    let checkinsDia = new Map();
    let checkinsNoche = new Map();
    let checkinsMixologia = new Map();
    let checkinsBarismo = new Map();

    function sumarPersonas(checkinsMap) {
        let total = 0;
        checkinsMap.forEach((_, codigo) => {
            const asistente = buscarEnDiaONoche(codigo);
            total += asistente ? Number(asistente.totalPersonas) || 0 : 0;
        });
        return total;
    }

    function calcularDesglose() {
        const todosCodigos = new Set([...checkinsDia.keys(), ...checkinsNoche.keys()]);
        let ambas = 0, soloDia = 0, soloNoche = 0, personasUnicas = 0;

        todosCodigos.forEach(codigo => {
            const enDia = checkinsDia.has(codigo);
            const enNoche = checkinsNoche.has(codigo);
            if (enDia && enNoche) ambas += 1;
            else if (enDia) soloDia += 1;
            else soloNoche += 1;

            const asistente = buscarEnDiaONoche(codigo);
            personasUnicas += asistente ? Number(asistente.totalPersonas) || 0 : 0;
        });

        return { todosCodigos, ambas, soloDia, soloNoche, medicosUnicos: todosCodigos.size, personasUnicas };
    }

    function render() {
        el.diaMedicos.textContent = checkinsDia.size;
        el.diaPersonas.textContent = sumarPersonas(checkinsDia);
        el.nocheMedicos.textContent = checkinsNoche.size;
        el.nochePersonas.textContent = sumarPersonas(checkinsNoche);
        el.mixologiaMedicos.textContent = checkinsMixologia.size;
        el.barismoMedicos.textContent = checkinsBarismo.size;

        const { ambas, soloDia, soloNoche, medicosUnicos, personasUnicas } = calcularDesglose();
        el.ambas.textContent = ambas;
        el.soloDia.textContent = soloDia;
        el.soloNoche.textContent = soloNoche;
        el.unicoMedicos.textContent = medicosUnicos;
        el.unicoPersonas.textContent = personasUnicas;
    }

    function escuchar(nombreColeccion, onUpdate) {
        onSnapshot(collection(db, nombreColeccion), (snapshot) => {
            const mapa = new Map();
            snapshot.forEach(docSnap => mapa.set(docSnap.id, docSnap.data()));
            onUpdate(mapa);
            render();
        }, (error) => console.error(`Error escuchando ${nombreColeccion}:`, error));
    }

    escuchar('checkins_dia', (mapa) => { checkinsDia = mapa; });
    escuchar('checkins_noche', (mapa) => { checkinsNoche = mapa; });
    escuchar('checkins_mixologia', (mapa) => { checkinsMixologia = mapa; });
    escuchar('checkins_barismo', (mapa) => { checkinsBarismo = mapa; });

    // --------------------------------------------------------------------
    // Exportar a Excel (.xlsx): resumen + detalle por actividad
    // --------------------------------------------------------------------
    const COLOR_ENCABEZADO = 'FF0060A8'; // var(--color-inst-blue)
    const COLOR_ZEBRA = 'FFF1F4F6';

    function estilizarEncabezado(row) {
        row.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ENCABEZADO } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        row.height = 22;
    }

    function aplicarZebra(sheet, totalFilas) {
        for (let i = 2; i <= totalFilas + 1; i++) {
            if (i % 2 === 0) {
                sheet.getRow(i).eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA } };
                });
            }
        }
    }

    function hojaTallerSimple(workbook, nombreHoja, checkinsMap, roster) {
        const hoja = workbook.addWorksheet(nombreHoja);
        hoja.columns = [
            { header: 'Código', key: 'codigo', width: 14 },
            { header: 'Primer Apellido', key: 'primerApellido', width: 20 },
            { header: 'Segundo Apellido', key: 'segundoApellido', width: 20 },
            { header: 'Nombre', key: 'nombre', width: 16 },
            { header: 'Hora de Ingreso', key: 'hora', width: 16 }
        ];

        const codigos = Array.from(checkinsMap.keys()).sort();
        codigos.forEach(codigo => {
            const asistente = buscarEnRoster(codigo, roster) || {};
            const checkin = checkinsMap.get(codigo);
            hoja.addRow({
                codigo,
                primerApellido: asistente.primerApellido || '',
                segundoApellido: asistente.segundoApellido || '',
                nombre: asistente.nombre || '',
                hora: checkin ? checkin.horaTexto : ''
            });
        });

        estilizarEncabezado(hoja.getRow(1));
        aplicarZebra(hoja, codigos.length);
        hoja.views = [{ state: 'frozen', ySplit: 1 }];
        return codigos.length;
    }

    async function exportarExcel() {
        if (!window.ExcelJS) {
            alert('No se pudo cargar la librería de Excel. Verifique su conexión e intente de nuevo.');
            return;
        }

        const { todosCodigos, ambas, soloDia, soloNoche, medicosUnicos, personasUnicas } = calcularDesglose();
        const totalGeneral = todosCodigos.size + checkinsMixologia.size + checkinsBarismo.size;

        if (totalGeneral === 0) {
            alert('Todavía no hay check-ins confirmados para exportar.');
            return;
        }

        const workbook = new window.ExcelJS.Workbook();
        workbook.creator = 'Convivio Familiar 2026';
        workbook.created = new Date();

        // ---- Hoja "Resumen" ----
        const resumen = workbook.addWorksheet('Resumen');
        resumen.columns = [
            { header: 'Indicador', key: 'indicador', width: 40 },
            { header: 'Valor', key: 'valor', width: 14 }
        ];
        const filasResumen = [
            ['Médicos ingresados — Día', checkinsDia.size],
            ['Total de personas — Día', sumarPersonas(checkinsDia)],
            ['Médicos ingresados — Noche', checkinsNoche.size],
            ['Total de personas — Noche', sumarPersonas(checkinsNoche)],
            ['Médicos únicos (Día + Noche, sin duplicar)', medicosUnicos],
            ['Total de personas únicas (sin duplicar)', personasUnicas],
            ['Asistieron a ambas actividades', ambas],
            ['Asistieron solo a Día', soloDia],
            ['Asistieron solo a Noche', soloNoche],
            ['Registrados — Taller Vitruvio de Mixología', checkinsMixologia.size],
            ['Registrados — Taller Vitruvio Barismo', checkinsBarismo.size]
        ];
        filasResumen.forEach(fila => resumen.addRow(fila));

        estilizarEncabezado(resumen.getRow(1));
        resumen.getColumn(2).alignment = { horizontal: 'center' };
        aplicarZebra(resumen, filasResumen.length);

        // ---- Hoja "Detalle Día y Noche" ----
        const detalle = workbook.addWorksheet('Detalle Día y Noche');
        detalle.columns = [
            { header: 'Código', key: 'codigo', width: 14 },
            { header: 'Primer Apellido', key: 'primerApellido', width: 20 },
            { header: 'Segundo Apellido', key: 'segundoApellido', width: 20 },
            { header: 'Nombre', key: 'nombre', width: 16 },
            { header: 'Total de Personas', key: 'totalPersonas', width: 16 },
            { header: 'Concierto de Noche', key: 'concierto', width: 16 },
            { header: 'Asistió Día', key: 'asistioDia', width: 12 },
            { header: 'Hora Ingreso Día', key: 'horaDia', width: 16 },
            { header: 'Asistió Noche', key: 'asistioNoche', width: 14 },
            { header: 'Hora Ingreso Noche', key: 'horaNoche', width: 18 },
            { header: 'Resumen de Asistencia', key: 'resumen', width: 20 }
        ];

        const codigosOrdenados = Array.from(todosCodigos).sort();
        codigosOrdenados.forEach(codigo => {
            const asistente = buscarEnDiaONoche(codigo) || {};
            const enDia = checkinsDia.get(codigo);
            const enNoche = checkinsNoche.get(codigo);

            let resumenAsistencia = 'Solo Noche';
            if (enDia && enNoche) resumenAsistencia = 'Ambas Actividades';
            else if (enDia) resumenAsistencia = 'Solo Día';

            detalle.addRow({
                codigo,
                primerApellido: asistente.primerApellido || '',
                segundoApellido: asistente.segundoApellido || '',
                nombre: asistente.nombre || '',
                totalPersonas: asistente.totalPersonas ?? '',
                concierto: asistente.concierto ? 'Sí' : 'No',
                asistioDia: enDia ? 'Sí' : 'No',
                horaDia: enDia ? enDia.horaTexto : '',
                asistioNoche: enNoche ? 'Sí' : 'No',
                horaNoche: enNoche ? enNoche.horaTexto : '',
                resumen: resumenAsistencia
            });
        });

        estilizarEncabezado(detalle.getRow(1));
        aplicarZebra(detalle, codigosOrdenados.length);
        detalle.autoFilter = { from: 'A1', to: 'K1' };
        detalle.views = [{ state: 'frozen', ySplit: 1 }];

        // ---- Hojas de talleres ----
        hojaTallerSimple(workbook, 'Taller Mixología', checkinsMixologia, window.ASISTENTES_MIXOLOGIA);
        hojaTallerSimple(workbook, 'Taller Barismo', checkinsBarismo, window.ASISTENTES_BARISMO);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `estadisticas-convivio-${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    }

    exportBtn.addEventListener('click', () => {
        exportBtn.disabled = true;
        const textoOriginal = exportBtnLabel.textContent;
        exportBtnLabel.textContent = 'Generando Excel...';
        exportarExcel().finally(() => {
            exportBtn.disabled = false;
            exportBtnLabel.textContent = textoOriginal;
        });
    });
});
