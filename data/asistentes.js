/* ==========================================================================
   DATOS DE EJEMPLO - Códigos de registro
   Reemplaza estos arreglos con la lista real de familias/agremiados.
   Cada actividad (día / noche) tiene su propia lista de códigos; por ahora
   se usan los mismos códigos de ejemplo en ambas para poder probar los dos
   flujos de registro.

   Campos de cada registro:
     codigo         - código único que ingresa el registrador (string)
     primerApellido - primer apellido del agremiado
     segundoApellido- segundo apellido del agremiado
     nombre         - nombre del agremiado
     totalPersonas  - total de personas que incluye el código (agremiado + familia)
     concierto      - true/false, si el grupo participa del concierto de la noche
                      (no se especificó en los datos de ejemplo; queda en true
                      por defecto hasta que se confirme el dato real)
   ========================================================================== */

const ASISTENTES_EJEMPLO = [
  { codigo: "MED2010", nombre: "Mario", primerApellido: "Arias", segundoApellido: "Murillo", totalPersonas: 1, concierto: true },
  { codigo: "MED11089", nombre: "Oscar", primerApellido: "Ledezma", segundoApellido: "Acevedo", totalPersonas: 3, concierto: true },
  { codigo: "MED15225", nombre: "Javier", primerApellido: "Solera", segundoApellido: "Madrigal", totalPersonas: 3, concierto: true },
  { codigo: "MED14727", nombre: "Oscar", primerApellido: "Ugalde", segundoApellido: "Jiménez", totalPersonas: 3, concierto: true },
  { codigo: "MED16118", nombre: "Miguel", primerApellido: "Goyenaga", segundoApellido: "Elizondo", totalPersonas: 3, concierto: true },
  { codigo: "MED16410", nombre: "Gerardo", primerApellido: "Villalobos", segundoApellido: "Zúñiga", totalPersonas: 3, concierto: true },
  { codigo: "MED16221", nombre: "Kevin", primerApellido: "Rosales", segundoApellido: "Ledezma", totalPersonas: 3, concierto: true },
  { codigo: "MED6415", nombre: "Mario", primerApellido: "Espinach", segundoApellido: "Roel", totalPersonas: 1, concierto: true }
];

window.ASISTENTES_DIA = ASISTENTES_EJEMPLO;
window.ASISTENTES_NOCHE = ASISTENTES_EJEMPLO;
