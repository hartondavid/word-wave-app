---
title: "Building a Bilingual Game: English and Romanian Dictionaries"
description: "The challenges and triumphs of curating a clean, engaging dictionary for two distinct languages."
slug: "building-bilingual-dictionaries"
path_en: "/en/blog/building-bilingual-dictionaries"
path_ro: "/ro/blog/building-bilingual-dictionaries"
lang: "en"
date: "2026-05-07T21:08:57.000Z"
keywords:
  - "bilingual"
  - "dictionary curation"
  - "romanian"
  - "english"
---

One of the standout features of WordWave is its full support for both English and Romanian gameplay. Building the underlying dictionaries for these languages was no small feat.

**The Challenge of Data Sourcing**
Finding a list of words is easy. Finding a list of words with *accurate, concise, and fun definitions* is very difficult. We couldn't just dump a standard dictionary into our database. Many standard definitions are either too academic, or they inadvertently contain the target word within the definition itself!

**Curating the Romanian Database**
For Romanian, we had to carefully navigate diacritics (ă, â, î, ș, ț). We made a design decision to allow players to type without diacritics (e.g., typing 's' instead of 'ș') to keep the game fast and accessible across all keyboards, while still displaying the correct diacritics in the solution.

**Balancing Difficulty**
What is considered a "general" word in English might have an obscure translation in Romanian, and vice-versa. We constantly tune our categories to ensure that a match feels fair and that the words selected are genuinely part of the common lexicon of the target audience.

We are always looking to expand. Have a great idea for a new category? Let us know!
