---
description: >-
  Un contador de aviones para grupos privados, con registro sin conexión e
  historial compartido.
metaDescription: >-
  Un contador de aviones para grupos privados, con registro sin conexión,
  historial compartido y operaciones sincronizadas.
summary: >-
  Aviões nació de un juego al que mi novia y yo jugamos: contar los aviones que
  vemos juntos. Creé la aplicación para registrar nuestros avistamientos y
  conservar el historial de un juego que sigue formando parte de nuestra vida
  cotidiana. La experiencia tiene tres vistas principales: contador, diario y
  marcador.
highlights:
  - contador, diario y marcador
  - registro sin conexión con IndexedDB
  - cola ordenada de operaciones pendientes
  - aplicación web instalable y aplicación de administración independiente
---

Aviões nació de un juego al que mi novia y yo jugamos: contar los aviones que vemos juntos. Creé la aplicación para registrar nuestros avistamientos y conservar el historial de un juego que sigue formando parte de nuestra vida cotidiana.

La experiencia tiene tres vistas principales: contador, diario y marcador. Los avistamientos consecutivos de la misma persona forman una racha en el diario. Los grupos son privados y funcionan mediante invitación; cada uno tiene su propio historial.

## Registro local y sincronización

Una vez cargado un grupo, se pueden seguir registrando avistamientos sin conexión a internet. El navegador conserva una copia de los datos en IndexedDB y una cola ordenada de operaciones pendientes. La interfaz actualiza el recuento sin esperar a que el servidor confirme el cambio.

Cuando vuelve la conexión, el servidor procesa las operaciones pendientes y las aplica en Postgres, que es la fuente de verdad. Reconoce las operaciones ya procesadas, de modo que reintentar una solicitud no crea registros duplicados.

Así se reparten las responsabilidades: el navegador se ocupa de la interacción y del registro sin conexión, mientras que el servidor valida los cambios y mantiene el estado compartido.

## Acceso por grupo y estructura de la aplicación

Cada lectura o escritura de datos de un grupo pasa por una comprobación de pertenencia en el servidor. El servidor obtiene la identidad y los permisos de la sesión autenticada y de sus propias comprobaciones de acceso.

El proyecto reúne una aplicación web instalable y una aplicación de administración independiente en un monorepo. Comparten paquetes de autenticación, acceso a datos, tipos y localización. La aplicación de administración gestiona usuarios y grupos, mientras que la aplicación principal se centra en contar aviones.
