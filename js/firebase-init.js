/* ==========================================================================
   INICIALIZACIÓN COMPARTIDA DE FIREBASE
   Un solo lugar donde se crea la conexión a Firestore, usado por
   registro.js, lista-taller.js y estadisticas.js.

   Se activa caché local persistente (IndexedDB) con soporte multi-pestaña:
   - Si el wifi del evento falla un momento, la pantalla sigue mostrando el
     último estado conocido en vez de quedar en blanco o con error.
   - Los "Confirmar Ingreso" hechos sin conexión quedan en cola y se envían
     solos en cuanto vuelve la señal, sin que el registrador tenga que
     reintentar manualmente.
   - Si alguien abre la misma lista en dos pestañas del mismo dispositivo,
     comparten la misma caché en vez de competir por ella.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
