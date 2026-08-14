/* ==========================================================================
   DATOS DE EJEMPLO - Códigos de registro
   Reemplaza estos arreglos con la lista real de familias/agremiados.
   Cada actividad (día / noche) tiene su propia lista de códigos.

   Campos de cada registro:
     codigo         - código único que ingresa el registrador (string)
     primerApellido - primer apellido del agremiado
     segundoApellido- segundo apellido del agremiado
     nombre         - nombre del agremiado
     totalPersonas  - total de personas que incluye el código (agremiado + familia)
     concierto      - true/false, si el grupo participa del concierto de la noche
   ========================================================================== */

window.ASISTENTES_DIA = [
  { codigo: "D001", primerApellido: "Rodríguez", segundoApellido: "Mora", nombre: "Juan", totalPersonas: 4, concierto: true },
  { codigo: "D002", primerApellido: "Vargas", segundoApellido: "Solís", nombre: "María", totalPersonas: 2, concierto: false },
  { codigo: "D003", primerApellido: "Jiménez", segundoApellido: "Castro", nombre: "Luis", totalPersonas: 1, concierto: true },
  { codigo: "D004", primerApellido: "Fernández", segundoApellido: "Araya", nombre: "Ana", totalPersonas: 5, concierto: true },
  { codigo: "D005", primerApellido: "Chacón", segundoApellido: "Rojas", nombre: "Pedro", totalPersonas: 3, concierto: false },
  { codigo: "D006", primerApellido: "Núñez", segundoApellido: "Salas", nombre: "Sofía", totalPersonas: 2, concierto: true }
];

window.ASISTENTES_NOCHE = [
  { codigo: "N001", primerApellido: "Rodríguez", segundoApellido: "Mora", nombre: "Juan", totalPersonas: 4, concierto: true },
  { codigo: "N002", primerApellido: "Alvarado", segundoApellido: "Quesada", nombre: "Carlos", totalPersonas: 2, concierto: true },
  { codigo: "N003", primerApellido: "Zúñiga", segundoApellido: "Bolaños", nombre: "Laura", totalPersonas: 6, concierto: true },
  { codigo: "N004", primerApellido: "Fernández", segundoApellido: "Araya", nombre: "Ana", totalPersonas: 5, concierto: true },
  { codigo: "N005", primerApellido: "Herrera", segundoApellido: "Campos", nombre: "Diego", totalPersonas: 1, concierto: false }
];
