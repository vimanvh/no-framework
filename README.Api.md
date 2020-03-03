API
===

Modul pro volání HTTP API [api.ts](/src/api.ts)


Základní HTTP operace
---------------------

Sémantika operací podporuje hladkou implementaci běžných REST rozhraní založených na JSON formátu.

K dispozici jsou  základní funkce `get()`, `post()`, `put()` a `del()` s generickými typy pro vstup `Request` i výstup `Response`. Argumentem je urlpath (např. `/users`) a objekt reprezentující vstupní argumenty.

*Příklad:*
```ts
const result = await get<Request,Response>("/users", { "name": "John" })

// result je typovaný jako Response
```

Funkce `get()` a `del()` převádí vstupní argumenty automaticky na query string, `post()` a `put()` je posílá jako body v JSON formátu. Pokud je vstupním argumentem standardní objekt typu `FormData`, jsou zaslány ve formátu `application/x-www-form-urlencoded`.

Funkce vracejí objekt výstupních dat daného výstupního generického typu. Metody `post()`, `put()` a `del()` definují implicitní generický typ `OperationResponse` pro výstupní objekt. Ukazuje se jako praktické používat takto jednotný typ napříč API. To umožňuje univerzálně a na jednom místě ošetřit
celou škálu speciálních situací, které operace mohou vracet. Zákaznický kód tak může od těchto specifik
zůstat poměrně dobře odstíněn.


Typologie API požadavků
-----------------------

- seznamy se stránkováním, filtrováním a řazením
- CRUD operace
- download souboru
- ostatní operace

Dotazy pro seznamy
------------------

Standarní API pro entitu (CRUD + další)
---------------------------------------

Download souboru
----------------

Konverze dat po přenosu z ISO formátu
-------------------------------------