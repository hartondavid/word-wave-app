---
title: "Why We Chose Supabase for WordWave's Backend"
description: "An overview of our decision to use Supabase as our BaaS provider and how it accelerates our development."
slug: "why-supabase-for-backend"
path_en: "/en/blog/why-supabase-for-backend"
path_ro: "/ro/blog/why-supabase-for-backend"
lang: "en"
date: "2026-04-16T21:08:57.000Z"
keywords:
  - "supabase"
  - "backend architecture"
  - "database"
  - "postgresql"
---

When starting a new multiplayer project, choosing the right backend infrastructure is crucial. We needed something that offered reliable real-time capabilities, a scalable database, and straightforward authentication (if we ever decide to add player accounts).

We evaluated several options, including Firebase, custom Node.js/Socket.io servers, and Supabase. We ultimately chose **Supabase**, and here is why:

Firstly, Supabase is built on PostgreSQL. We love SQL. Having a relational database gives us strict schema definitions and powerful querying capabilities right out of the box.

Secondly, the real-time subscriptions feature is a game-changer. Supabase listens to database changes and broadcasts them over WebSockets. This meant we could build our multiplayer logic simply by inserting and updating rows in a "game_rooms" table, without writing a complex custom WebSocket server.

Finally, the developer experience is excellent. The Supabase client library integrates perfectly with Next.js, allowing us to rapidly prototype and deploy WordWave. It has allowed our small team to focus on the game mechanics rather than managing infrastructure.
