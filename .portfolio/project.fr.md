---
description: >-
  Un compteur d'avions pour des groupes privés, avec enregistrement hors ligne
  et historique partagé.
metaDescription: >-
  Un compteur d'avions pour des groupes privés, avec enregistrement hors ligne,
  historique partagé et opérations synchronisées.
summary: >-
  Aviões est né d'un jeu que ma copine et moi aimons : compter les avions que
  nous voyons ensemble. J'ai créé l'application pour noter nos observations et
  garder l'historique d'un jeu qui fait toujours partie de notre quotidien.
  L'expérience s'articule autour de trois vues principales : un compteur, un
  journal et un classement.
highlights:
  - un compteur, un journal et un classement
  - enregistrement hors ligne avec IndexedDB
  - file ordonnée des opérations en attente
  - application web installable et application d'administration séparée
---

Aviões est né d'un jeu que ma copine et moi aimons : compter les avions que nous voyons ensemble. J'ai créé l'application pour noter nos observations et garder l'historique d'un jeu qui fait toujours partie de notre quotidien.

L'expérience s'articule autour de trois vues principales : un compteur, un journal et un classement. Les observations consécutives de la même personne forment une série dans le journal. Les groupes sont privés et accessibles sur invitation ; chacun possède son propre historique.

## Enregistrement local et synchronisation

Une fois qu'un groupe est chargé, on peut continuer à enregistrer des observations sans connexion internet. Le navigateur conserve une copie des données dans IndexedDB ainsi qu'une file ordonnée d'opérations en attente. L'interface met à jour le compteur sans attendre la confirmation du serveur.

Lorsque la connexion revient, le serveur traite les opérations en attente et les applique à Postgres, qui fait foi. Il reconnaît les opérations déjà traitées : réessayer une requête ne crée donc pas de doublons.

Cette répartition confie l'interaction et l'enregistrement hors ligne au navigateur, tandis que le serveur valide les modifications et maintient l'état partagé.

## Accès par groupe et structure de l'application

Chaque lecture ou écriture de données d'un groupe passe par une vérification d'appartenance côté serveur. Le serveur déduit l'identité et les autorisations de la session authentifiée et de ses propres contrôles d'accès.

Le projet réunit une application web installable et une application d'administration séparée au sein d'un monorepo. Elles partagent des packages pour l'authentification, l'accès aux données, les types et la localisation. L'application d'administration gère les utilisateurs et les groupes, tandis que l'application principale reste centrée sur le comptage.
