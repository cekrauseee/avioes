---
description: "Um PWA offline-first para grupos contarem avistamentos de aviões."
metaDescription: "Aviões é um PWA offline-first para grupos contarem avistamentos de aviões, acompanharem sequências e compararem placares compartilhados."
summary: "Aviões é um PWA offline-first para grupos de amigos que contam avistamentos de aviões juntos. Um toque registra o avistamento, atualiza o total do grupo e mantém um diário e um placar compartilhados."
highlights:
  - "Offline-first"
  - "Grupos multi-tenant"
  - "Next.js"
  - "Postgres"
  - "IndexedDB"
  - "PWA"
---

## Produto

Participantes tocam uma vez quando veem um avião. O aplicativo registra cada avistamento no grupo ativo, combina avistamentos consecutivos da mesma pessoa em sequências e mantém totais, líderes e atividades recentes fáceis de consultar.

Os grupos são privados e acessíveis apenas por convite. Cada pessoa pode participar de mais de um grupo, alternar entre eles e consultar cada histórico compartilhado sem misturar os dados.

## O que construí

Construí o PWA instalável e seu backoffice como um Turborepo com Next.js, React, TypeScript, Postgres e Drizzle. O backoffice oferece um espaço separado para gerenciar usuários e grupos.

O produto permite acesso por e-mail e senha, código de uso único, passkey e Google. Ele está disponível em português do Brasil e inglês, com temas claro e escuro e seis paletas de cores.

## Decisões de engenharia

Um snapshot no IndexedDB e uma fila ordenada de operações mantêm a contagem disponível offline. Alterações pendentes são sincronizadas por Server Actions quando a conexão retorna, enquanto o Postgres permanece como fonte da verdade.

Cada leitura e escrita de um grupo é verificada no servidor conforme a participação da pessoa. Isso mantém rápida a interação de um toque sem transferir decisões de autenticação ou isolamento de grupos para o navegador.
