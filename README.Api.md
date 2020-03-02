API
===

Modul pro volání HTTP API [api.ts](/src/api.ts)


Základní HTTP operace
---------------------

### GET

Vrací object typu Response
```ts
await api.get<Response>("/urlpath");
```

Vrací object typu Response, volá se s query stringem typu QueryStringType
```ts
await api.get<QueryStringType, Response>("/urlpath", { id: 3 });
```

### POST

Pošle metodou POST data typu Request, vrací objekt typu OperationResponse
```ts
await api.post<Request>("/urlpath", {...})
```

Pošle metodou POST data typu Request, vrací objetk typu Response
```ts
await api.post<User, Response>("/user/create", {...})
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