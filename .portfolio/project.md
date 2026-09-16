---
slug: avioes
portfolioIndex: 3
name: cekrause/avioes
repositoryUrl: https://github.com/cekrauseee/avioes
description: >-
  A plane counter for private groups, with offline recording and a shared
  history.
metaDescription: >-
  A plane counter for private groups, with offline recording, shared history,
  and synchronized operations.
summary: >-
  Aviões grew out of a game my girlfriend and I play: counting the planes we
  see together. I built the app to record our sightings and keep a history of
  a game that is still part of our everyday lives. The experience has three
  main views: a counter, a diary, and a scoreboard.
highlights:
  - a counter, a diary, and a scoreboard
  - offline recording with IndexedDB
  - an ordered queue of pending operations
  - an installable web app and a separate administration app
---

Aviões grew out of a game my girlfriend and I play: counting the planes we see together. I built the app to record our sightings and keep a history of a game that is still part of our everyday lives.

The experience has three main views: a counter, a diary, and a scoreboard. Consecutive sightings by the same person form a streak in the diary. Groups are private and invite-only, each with its own history.

## Local recording and synchronization

Once a group has loaded, sightings can still be recorded without an internet connection. The browser keeps a copy of the data in IndexedDB and an ordered queue of pending operations. The interface updates the count without waiting for the server to confirm the change.

When connectivity returns, the server processes the pending operations and applies them to Postgres, the source of truth. It recognizes operations that have already been processed so that retrying a request does not create duplicate records.

This divides responsibility between the two sides: the browser handles interaction and offline recording, while the server validates changes and maintains the shared state.

## Group access and application structure

Every read or write of group data goes through a server-side membership check. The server derives identity and permissions from the authenticated session and its own access checks.

The project brings together an installable web app and a separate administration app in a monorepo. They share packages for authentication, data access, types, and localization. The administration app handles users and groups, while the main app stays focused on counting.
