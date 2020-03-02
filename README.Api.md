API
===

Modul pro volání HTTP API [api.ts](/src/api.ts)


Základní HTTP operace
---------------------

### GET

Vrací `Promise<Response>`
```ts
api.get<Response>("/urlpath");
```

Vrací `Promise<Response>`, volá se s query stringem typu `QueryStringType`
```ts
api.get<QueryStringType, Response>("/urlpath", { id: 3 });
```

### POST

Pošle metodou POST `data` typu `Request`, vrací `Promise<OperationResponse>`
```ts
api.post<Request>("/urlpath", data)
```

Pošle metodou POST `data` typu `Request`, vrací `Promise<Response>`
```ts
api.post<Request, Response>("/user/create", data)
```

### PUT

Pošle metodou PUT `data` typu `Request`, vrací `Promise<OperationResponse>`
```ts
api.put<Request>("/urlpath", data)
```

Pošle metodou PUT `data` typu `Request`, vrací `Promise<Response>`
```ts
api.put<Request, Response>("/user/create", data)
```


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