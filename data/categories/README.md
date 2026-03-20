# Category word lists

JSON-urile din acest folder **nu** sunt servite ca fișiere statice. Aplicația citește de aici doar pe server și expune **o singură pereche** cuvânt + definiție prin `GET /api/words`.

Nu muta aceste fișiere înapoi în `public/` — ar deveni din nou vizibile integral în rețea.
