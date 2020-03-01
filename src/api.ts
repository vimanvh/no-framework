/*
 * HTTP komunikace. Obálky požadavků, odpovědí a dotazů
 */

import axios from "axios";

/**
 * API endpoint
 */
const endPoint = "http://localhost/api"

/**
 * Podporované HTTP metody.
 */
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Odpověď serveru na požadavek získání seznamu
 */
interface ListResponse<Item> {
	/**
	 * Pole entit
	 */
	data: Item[];

	/**
	 * Celkový počet záznamů
	 */
	count: number;
}

/**
 * Odpověď serveru na operace kromě získání seznamu
 */
interface OperationResponse {
	messages: string[];
}

/**
 * Operátory pro dotazy nad typem "string".
 */
type QueryOperatorString = "=" | "<>"

/**
 * Operátory pro dotazy nad typem "number".
 */
type QueryOperatorNumber = "<" | "<=" | ">" | "=>" | "=" | "<>";

/**
 * Operátory pro dotazy nad typem "boolean".
 */
type QueryOperatorBoolean = "is" | "is not";

/**
 * Operátory pro dotazy nad typem "Date".
 */
type QueryOperatorDate = QueryOperatorNumber;

/**
 * Přiřazení query operátorů datovým typům
 */
type QueryOperator<T> =
	T extends string ? QueryOperatorString :
	T extends number ? QueryOperatorNumber :
	T extends boolean ? QueryOperatorBoolean :
	T extends Date ? QueryOperatorDate :
	undefined;

/**
 * Definice parametru v dotazu
 */
interface QueryParameter<TItem, TField extends keyof TItem> {
	field: keyof TItem;
	operator: QueryOperator<TItem[TField]>;
	value: TItem[TField] | null;
}

/**
 * Model dotazu pro získání seznamu entit.
 */
interface Query<TItem> {
	searchprase?: string;
	deleted?: boolean;
	filter?: QueryParameter<TItem, keyof TItem>[];
	page?: number;
	pageSize?: number;
	sortFields?: Array<keyof TItem>;
	sortFieldsDesc?: Array<keyof TItem>;
}

/**
 * Vytvoří query parametr pro dotaz nad seznamem.
 */
export function qp<TItem, TField extends keyof TItem>(
	field: TField,
	operator: QueryOperator<TItem[TField]>,
	value: TItem[TField] | null): QueryParameter<TItem, TField> {

	return { field, operator, value };
}

/**
 * Univerzální HTTP požadavek
 * 
 * @param path 					Path požadavku		
 * @param method				HTTP metoda 
 * @param requestData 			Vstupní data požadavku	
 * @param downloadFileName		Název stahovaného souboru 
 */
function serverRequest<Request, Response>(
	path: string,
	method: HttpMethod,
	requestData: Request | null = null,
	downloadFileName: string | null = null): Promise<Response> {

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
					const message = response.status == 0
						? "Spojení se serverem bylo ztraceno."
						: "Při komunikaci se serverem nastala chyba č. " + response.status + ".";
					reject(message);
				}
				return;
			}

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
				resolve({} as Response);
				return;
			}
			resolve(response.data as Response);

		}).catch((error) => {
			reject("Nastala chyba komunikace se serverem.");
		});
	});
}

/**
 * Provede požadavek metodou GET
 * 
 * @param path 			Path požadavku
 * @param requestData 	Vstupní data (zasílaná jako QueryString)
 */
export function get<Request = {}, Response = {}>(path: string, requestData: Request | null = null): Promise<Response> {
	return serverRequest(path, "GET", requestData);
}

/**
 * Provede požadavek metodou POST
 * 
 * @param path 			Path požadavku
 * @param requestData  	Vstupní data (zasílaná jako JSON)
 */
export function post<Request = {}, Response = OperationResponse>(path: string, requestData: Request): Promise<Response> {
	return serverRequest<Request, Response>(path, "POST", requestData);
}

/**
 * Provede požadavek metodou PUT
 * 
 * @param path 			Path požadavku
 * @param requestData  	Vstupní data (zasílaná jako JSON)
 */
export function put<Request, Response = OperationResponse>(path: string, requestData: Request): Promise<Response> {
	return serverRequest<Request, Response>(path, "PUT", requestData);
}

/**
 * Provede požadavek metodou DELETE
 * 
 * @param path 			Path požadavku
 * @param requestData 	Vstupní data (zasílaná jako QueryString)
 */
export function del<Request = {}, Response = OperationResponse>(path: string, requestData: Request | null = null): Promise<Response> {
	return serverRequest<Request, Response>(path, "DELETE", requestData);
}

/**
 * Provede download v samostatném okně prohlížeče metodou POST pod názvem fileName
 * 
 * @param path 			Path požadavku
 * @param requestData 	Vstupní data (zasílaná jako QueryString)
 * @param fileName		Název downloadovaného souboru
 */
export function download<Request = {}>(path: string, requestData: Request | null = null, fileName: string, httpType: "GET" | "POST" = "GET"): Promise<{}> {
	return serverRequest<Request, {}>(path, httpType, requestData, fileName);
}

/**
 * Načte filtrovaný seznam
 * 
 * @param path 		Path požadavku
 * @param query		Dotaz na záznamy (filtr)
 */
export function loadList<Item>(path: string, query: Query<Item> = {}) {
	return post<Query<Item>, ListResponse<Item>>(path, query);
}

/**
 * Stáhne filtrovaný seznam
 * 
 * @param path 		Path požadavku
 * @param query		Dotaz na záznamy (filtr)
 * @param fileName	Název souboru po staženíQuery<Item>
 */
export function downloadList<Item>(path: string, fileName: string, query: Query<Item> = {}) {
	return download<Query<Item>>(path, query, fileName);
}