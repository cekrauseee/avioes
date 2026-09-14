---
description: >-
  Contagem de aviões em grupos privados, com registro offline e histórico
  compartilhado.
metaDescription: >-
  Contagem de aviões em grupos privados, com registro offline, histórico
  compartilhado e sincronização de operações.
summary: >-
  O Aviões nasceu de uma brincadeira entre mim e a minha namorada: contar os
  aviões que vemos juntos. Desenvolvi o aplicativo para registrar os
  avistamentos e acompanhar o histórico dessa brincadeira, que continua fazendo
  parte da nossa rotina. A experiência se organiza em três partes: contador,
  diário e placar.
highlights:
  - contador, diário e placar
  - registro offline e fila ordenada de operações
  - histórico separado para cada grupo
  - aplicação web instalável e backoffice em um monorepo
---

O Aviões nasceu de uma brincadeira entre mim e a minha namorada: contar os aviões que vemos juntos. Desenvolvi o aplicativo para registrar os avistamentos e acompanhar o histórico dessa brincadeira, que continua fazendo parte da nossa rotina.

A experiência se organiza em três partes: contador, diário e placar. Avistamentos consecutivos da mesma pessoa formam uma sequência no diário. Os grupos são privados e funcionam por convite, com um histórico separado para cada grupo.

## Registro local e sincronização

Depois de carregar um grupo, é possível continuar registrando avistamentos sem conexão. O navegador mantém uma cópia dos dados em IndexedDB e uma fila ordenada de operações pendentes. A interface atualiza a contagem sem aguardar a confirmação do servidor.

Quando a conexão retorna, as operações são sincronizadas com o Postgres, que mantém o estado de referência. O servidor identifica operações já processadas para que uma nova tentativa de envio não duplique os registros.

Essa estrutura distribui responsabilidades: o navegador sustenta a interação e o registro offline; o servidor valida as alterações e consolida os dados compartilhados.

## Acesso por grupo e organização da aplicação

Cada leitura e escrita de dados do grupo passa pela verificação de participação no servidor. A identidade e as permissões são obtidas da sessão autenticada, sem depender das informações de acesso enviadas pelo navegador.

O projeto reúne a aplicação web instalável e um backoffice em um monorepo. Os dois compartilham pacotes de autenticação, acesso a dados, tipos e tradução. O backoffice concentra a administração de usuários e grupos, enquanto a aplicação principal mantém o foco na contagem.
