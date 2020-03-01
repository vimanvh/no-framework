/*
 * HTTP komunikace typovaně
 *
 * 		- obecné HTTP operace typovaně
 * 		- podpora typovaných dotazů pro načítání seznamů
 * 		- standardní výsledek API operace
 */

import axios from "axios";

/**
 * API endpoint
 */
const endPoint = "http://localhost/api"

/**
 * Podporované HTTP metody
 */
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Standardní odpověď na operaci. Operace je požadavek, jehož smyslem je v systému něco
 * provést. Ať už CUD nebo specifické zákaznické operace.
 */
interface OperationResponse {
	//TODO: Dodefinujte vlastní strukturu, kterou vaše API vrací
}

/**
 * Standardní odpověď serveru obalující seznam
 */
interface ListResponse<Item> {
	/**
	 * Pole položek
	 */
	data: Item[];

	/**
	 * Celkový počet záznamů bez ohledu na stránkování
	 */
	count: number;
}

/**
 * Model dotazu pro získání filtrovaného a stránkovaného seznamu.
 */
interface Query<TItem> {
	searchprase?: string;
	deleted?: boolean;
	filter?: QueryFilterItem<TItem, keyof TItem>[];
	page?: number;
	pageSize?: number;
	sortFields?: Array<keyof TItem>;
	sortFieldsDesc?: Array<keyof TItem>;
}

/**
 * Definice položky filtru v modelu dotazu
 */
interface QueryFilterItem<TItem, TField extends keyof TItem> {
	field: keyof TItem;
	operator: QueryFilterOperator<TItem[TField]>;
	value: TItem[TField] | null;
}

/**
 * Operátory pro dotazy na hodnotu typu "string".
 */
type QueryFilterOperatorString = "=" | "<>"

/**
 * Operátory pro dotazy na hodnotu typu "number".
 */
type QueryFilterOperatorNumber = "<" | "<=" | ">" | "=>" | "=" | "<>";

/**
 * Operátory pro dotazy na hodnotu typu "boolean".
 */
type QueryFilterOperatorBoolean = "is" | "is not";

/**
 * Operátory pro dotazy na hodnotu typu "Date".
 */
type QueryFilterOperatorDate = QueryFilterOperatorNumber;

/**
 * Přiřazení query operátorů datovým typům
 */
type QueryFilterOperator<T> =
	T extends string ? QueryFilterOperatorString :
	T extends number ? QueryFilterOperatorNumber :
	T extends boolean ? QueryFilterOperatorBoolean :
	T extends Date ? QueryFilterOperatorDate :
	undefined;

/**
 * Helper pro vytvoření položky query filtru.
 * 
 * Příklad:
 * 
 * 		interface User {
 * 			name: string;
 * 			age: number;
 * 		}
 * 		
 * 		api.loadList<User>("/path", { filter:[
 * 			api.qp("name", "=", "Jan"),
 * 			api.qp("age", "<=", 18),
 * 		]})
 */
export function qp<TItem, TField extends keyof TItem>(
	field: TField,
	operator: QueryFilterOperator<TItem[TField]>,
	value: TItem[TField] | null): QueryFilterItem<TItem, TField> {

	return { field, operator, value };
}

/**
 * Univerzální HTTP požadavek. Zde implementován pomocí axiosu. Implementaci lze
 * jakkoli nahradit nebo rozšiřovat podle specifik konkrétního projektu.
 * 
 * @param path 					URL path požadavku		
 * @param method				HTTP metoda 
 * @param requestData 			Vstupní data požadavku	
 * @param downloadFileName		Název stahovaného souboru 
 */
function serverRequest<Request, Response>(
	path: string,
	method: HttpMethod,
	requestData: Request | undefined = undefined,
	downloadFileName: string | undefined = undefined): Promise<Response> {

	let requestIsFormData = requestData && (requestData as any).constructor !== undefined && (requestData as any).constructor.name == "FormData";
	let sendAsJSON = (method == "POST" || method == "PUT") && !requestIsFormData;
	let contentType: string = "application/x-www-form-urlencoded; charset=UTF-8";
	if (sendAsJSON) {
		contentType = "application/json";
	}

	const headers: any = {}
	if (!requestIsFormData) {
		headers["Content-Type"] = contentType;
	}

	return new Promise(function (resolve, reject) {

		axios.request({
			method: method,
			url: endPoint + path,
			data: requestData,
			responseType: downloadFileName ? "blob" : "text",
			headers
		}).then((response) => {
			if (response.status < 200 || response.status > 299) {
				if (response.data != null) {
					reject(response.data);
				} else {
					reject("Při komunikaci se serverem nastala chyba č. " + response.status + ".");
				}
				return;
			}

			// Následující větev je závislá na běhu v browseru. Lze odstranit nebo nahradit
			// pro běh na serveru

			if (downloadFileName) {
				if (window.navigator.msSaveOrOpenBlob) {
					// IE 11
					window.navigator.msSaveOrOpenBlob(response.data, downloadFileName);
				} else {
					// pro ostatní prohlížeče simulujeme klik na odkaz pro stažený souboru,
					// díky tomu se soubor okamžitě stahuje
					var elementA = document.createElement("a");
					var url = window.URL.createObjectURL(response.data);
					elementA.href = url;
					elementA.download = downloadFileName;
					elementA.click();
					window.URL.revokeObjectURL(url);
				}
				resolve();
				return;
			}
			resolve(response.data as Response);

		}).catch((error) => {
			reject("Nastala chyba komunikaci se serverem.");
		});
	});
}

/**
 * Provede požadavek metodou GET
 * 
 * @param path 			URL path požadavku
 * @param requestData 	Vstupní data (zasílaná jako QueryString)
 */
export function get<Response>(path: string): Promise<Response>;
export function get<Request, Response>(path: string, requestData: Request): Promise<Response>;
export function get<Request, Response>(path: string, requestData?: Request): Promise<Response> {
	return serverRequest(path, "GET", requestData);
}

/**
 * Provede požadavek metodou POST
 * 
 * @param path 			URL path požadavku
 * @param requestData  	Vstupní data (zasílaná jako JSON)
 */
export function post<Request, Response = OperationResponse>(path: string, requestData: Request): Promise<Response> {
	return serverRequest<Request, Response>(path, "POST", requestData);
}

/**
 * Provede požadavek metodou PUT
 * 
 * @param path 			URL path požadavku
 * @param requestData  	Vstupní data (zasílaná jako JSON)
 */
export function put<Request, Response = OperationResponse>(path: string, requestData: Request): Promise<Response> {
	return serverRequest<Request, Response>(path, "PUT", requestData);
}

/**
 * Provede požadavek metodou DELETE
 * 
 * @param path 			URL path požadavku
 * @param requestData 	Vstupní data (zasílaná jako QueryString)
 */
export function del<Response = OperationResponse>(path: string): Promise<Response>;
export function del<Request, Response = OperationResponse>(path: string, requestData: Request): Promise<Response>;
export function del<Request, Response = OperationResponse>(path: string, requestData?: Request): Promise<Response> {
	return serverRequest<Request, Response>(path, "DELETE", requestData);
}

/**
 * Provede download v samostatném okně prohlížeče metodou POST pod názvem fileName
 * 
 * @param path 			URL path požadavku
 * @param fileName		Název downloadovaného souboru
 *
 * @param requestData 	Vstupní data (zasílaná jako QueryString)
 */
export function download(path: string, fileName: string): Promise<void>;
export function download<Request>(path: string, fileName: string, requestData: Request): Promise<void>;
export function download<Request>(path: string, fileName: string, requestData?: Request): Promise<void> {
	return serverRequest<Request, void>(path, "POST", requestData, fileName);
}

/**
 * Načte filtrovaný seznam
 * 
 * @param path 		URL path požadavku
 * @param query		Dotaz na záznamy (filtr)
 */
export function loadList<Item>(path: string, query: Query<Item> = {}) {
	return post<Query<Item>, ListResponse<Item>>(path, query);
}

/**
 * Stáhne filtrovaný seznam
 * 
 * @param path 		URL path požadavku
 * @param query		Dotaz na záznamy (filtr)
 * @param fileName	Název souboru po staženíQuery<Item>
 */
export function downloadList<Item>(path: string, fileName: string, query: Query<Item> = {}) {
	return download(path, fileName, query);
}