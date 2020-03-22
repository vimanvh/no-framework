API
===

Modul pro volání HTTP API [api.ts](/src/api.ts)


Základní HTTP operace
---------------------

Sémantika operací podporuje hladkou implementaci běžných REST rozhraní založených na JSON formátu.

K dispozici jsou  základní funkce `get()`, `post()`, `put()` a `del()` s generickými typy pro vstup `Request` i výstup `Response`. Argumentem je urlpath (např. `/users`) a objekt reprezentující vstupní argumenty.

*Příklad:*
```ts
const result = await get<Request,User>("/user", { "id": 34 })

// result je typovaný jako User
```

Funkce `get()` a `del()` převádí vstupní argumenty automaticky na QUERY STRING, `post()` a `put()` je posílá jako body v JSON formátu. Pokud je však vstupním argumentem standardní objekt typu `FormData`, jsou zaslány ve formátu `application/x-www-form-urlencoded`.

Funkce vracejí objekt typu `Response`. Metody `post()`, `put()` a `del()` definují implicitní generický typ `OperationResponse` pro výstupní objekt. Ukazuje se jako praktické používat takto jednotný typ napříč API. To umožňuje univerzálně a na jednom místě ošetřit
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
Pro práci se seznamy požadujeme načtení seznamu položek, který je stránkován, filtrován a seřazen. K tomu slouží funkce `loadList()`,
které jako vstupní argument předáváme `query`, a která vrací obálku `ListResponse`. Ta obsahuje kromě požadovaného seznamu obsahující
pouze jednu stránku také informaci o celkovém počtu záznamu odpovědi na dotaz.

*Příklad stránkování a řazení:*
```ts
import { loadList, qp } from "./api"

const result = await loadList<User>("/users", {
	paging: {
		page: 1,
		pageSize: 30
	},
	sorting: [
		["lastName", "desc"],
		"firstName",
	]
});

result:
{
	data: [...],
	count: 66788
}
```

*Příklad pro nastavení filtru*
```ts
import { loadList, qp } from "./api"

const result = await loadList<User>("/users", {
	filter: {
		searchPhrase: "Novák",
		query: [
			qp("age", ">", 18),
			qp("gender", "=", "muz")
		]
	}
})

result:
{
	data: [...],
	count: 23
}
```


Standarní API pro entitu (CRUD + další)
---------------------------------------

Pro entity, tedy jednoznačně identifikované položky můžeme definovat standardní API:

```ts
import { EntityApi } from "./api"

const usersApi = new EntityApi<User, UserEdit>({ path: "/users" });
```

Nyní lze bez dalších dodatečných definic rovnou provádět tyto operace:

**Načtení entity**
```ts
const user = await usersApi.load(id);
```

**Načtení filtrovaného, stránkovaného a řazeného seznamu entit**
```ts
const user = await usersApi.loadList(query);
```

**Vytvoření entity**
```ts
await usersApi.create(user);
// id vytvořené entity lze získat z výsledku
```

**Aktualizace entity**
```ts
await usersApi.update(user);
```

**Odstranění entity**
```ts
await usersApi.remove(id);
```

**Hromadné odstranění entit**
```ts
await usersApi.bulkRemove([1,2,3]);
```

**Obnova smazané entity**
```ts
await usersApi.restore(id);
```

**Hromadná obnova entit**
```ts
await usersApi.bulkRestore([1,2,3]);
```

Download
--------

**Stažení souboru**

Stažení souboru provedeme pomocí funkce `download()`:

```ts
await download("/obchodni-podminky", "obchodni-podminky.pdf");
```

**Stažení seznamu**

Stažení seznamu provedeme pomocí funkce `downloadList()`. Na stránkování se standardně nebere zřetel
a stahují se všechna data vyhovující filtru:

```ts
await downloadList("/export", "exportovana_data.xls", query);
```