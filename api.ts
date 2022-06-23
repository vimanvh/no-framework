
/*
 * HTTP komunikace typovaně
 *
 * 		- obecné HTTP operace typovaně
 * 		- podpora typovaných dotazů pro načítání seznamů
 * 		- standardní výsledek API operace
 * 		- standardní API pro entitu (sada operací opakující se pro každou entitu)
 */

import axios, { AxiosResponse } from "axios";
import * as notification from "./notification";

export const emptyGuid = "00000000-0000-0000-0000-000000000000";

/**
 * Podporované HTTP metody
 */
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Typ pro ID
 */
export type Id = number;

/**
 * Typ zprávy ze serveru.
 */
export enum ServerMessageType {
	Error = 1,
	Warning = 2,
	Info = 3
}

/**
 * Standardní odpověď na operaci. Operace je požadavek, jehož smyslem je v systému něco
 * provést. Ať už CUD nebo specifické zákaznické operace.
 */
export interface OperationResponse {
	messages: {
		type: ServerMessageType;
		code: number;
		message: string;
	}[];
	id: string | number;
}

export interface FieldMetadata {
	name: string;
}

/**
 * Standardní odpověď serveru obalující seznam
 */
export interface ListResponse<Item> {
	data: Item[];
	message: string | null;
	pagination: {
		object_count: number;
		page: number;
		per_page: number;
	};
	structure?: FieldMetadata[];
}

/**
 * Vytvoří implicitní obálku seznamu entit.
 */
export function createDefaultListEnvelope<TModel>(): ListResponse<TModel> {
	return {
		data: [],
		message: "",
		pagination: {
			object_count: 0,
			page: 1,
			per_page: 25
		}
	};
}

/**
 * Model dotazu pro získání filtrovaného a stránkovaného seznamu.
 */
export interface Query<TItem> {
	fulltext?: string;
	filter?: QueryFilterItem<TItem, keyof TItem>[];
	fields?: (keyof TItem)[];
	page?: number;
	per_page?: number;
	sort_fields?: Array<keyof TItem>;
	sort_fields_desc?: Array<keyof TItem>;
	deleted?: boolean;
	disable_count?: boolean;
}

/**
 * Definice položky filtru v modelu dotazu
 */
export interface QueryFilterItemSimple<TItem, TField extends keyof TItem> {
	field: keyof TItem;
	operator: QueryFilterOperator<TItem[TField]>;
	value: TItem[TField] | null;
}

/**
 * parametr s obecným výrazem
 */
export class QueryFilterItemExpression {
	constructor(private expression: string) {
	}

	toString = () => {
		return this.expression;
	}
}

/**
 * parametr s konstrukcí OR
 */
export class QueryFilterItemOr<TItem>  {
	constructor(public queryItems: QueryFilterItem<TItem, any>[]) {
	}

	toString = (): string => {
		return toQueryString(this.queryItems, "||");
	}
}

export type QueryFilterItem<TModel, TField extends keyof TModel>
	= QueryFilterItemSimple<TModel, TField>
	| QueryFilterItemExpression
	| QueryFilterItemOr<TModel>;

/**
 * Operátory pro dotazy na hodnotu typu "string".
 */
export type QueryFilterOperatorString = "=" | "!=";

/**
 * Operátory pro dotazy na hodnotu typu "number".
 */
export type QueryFilterOperatorNumber = "<" | "<=" | ">" | ">=" | "=" | "!=";

/**
 * Operátory pro dotazy na hodnotu typu "boolean".
 */
export type QueryFilterOperatorBoolean = "=";

/**
 * Operátory pro dotazy na hodnotu typu "Date".
 */
export type QueryFilterOperatorDate = QueryFilterOperatorNumber;

/**
 * Přiřazení query operátorů datovým typům
 */
export type QueryFilterOperator<T> =
	T extends string ? QueryFilterOperatorString :
	T extends number ? QueryFilterOperatorNumber :
	T extends boolean ? QueryFilterOperatorBoolean :
	T extends Date ? QueryFilterOperatorDate :
	undefined;

/**
 * Helper pro vytvoření položky query filtru.
 */
export function qp<TItem, TField extends keyof TItem>(
	field: TField,
	operator: QueryFilterOperator<TItem[TField]>,
	value: TItem[TField] | null): QueryFilterItem<TItem, TField> {

	return { field, operator, value };
}

export function qpe(expression: string) {
	return new QueryFilterItemExpression(expression);
}

export function qpOr<TItem, TField extends keyof TItem>(queryItems: QueryFilterItem<TItem, any>[]) {
	return new QueryFilterItemOr(queryItems);
}

/**
 * Interní model dotazu pro přímé zaslání API.
 */
interface QueryInternal extends Omit<Query<any>, "filter" | "sort_fields" | "sort_fields_desc"> {
	filter?: string;
	sort_fields?: string;
	sort_fields_desc?: string;
}

/**
 * Převede seznam query parametrů na dotazovací řetězec pro API.
 */
export function toQueryString<TModel>(queryParameters: QueryFilterItem<TModel, keyof TModel>[], operator: "&" | "||") {
	function toValueString(value: any) {
		if (value instanceof Date) {
			return (value as Date).toISOString();
		} else if (Array.isArray(value)) {
			// Předpokládáme, že pole vždy obsahuje Id a konvertujeme na pole těchto id
			return "[" + value.map(i => {
				let item = i.id ?? i;
				if (typeof item === "string") {
					item = "\"" + item + "\"";
				}
				return item;
			}).toString() + "]";
		} else if (typeof value === "string") {
			return "\"" + value.toString() + "\"";
		} else {
			return value.toString();
		}
	}

	function hasNonEmptyValue(queryPar: QueryFilterItem<TModel, keyof TModel>): boolean {
		if (queryPar instanceof QueryFilterItemExpression) {
			return queryPar.toString().trim() !== "";
		} else if (queryPar instanceof QueryFilterItemOr) {
			return queryPar.queryItems.filter(i => hasNonEmptyValue(i)).length > 0;
		} else if (queryPar.value == null) {
			return false;
		} else if (typeof queryPar.value === "string" && queryPar.value.trim() === "") {
			return false;
		} else if (queryPar.value instanceof Array && queryPar.value.length === 0) {
			return false;
		}

		return true;
	}

	function toStringQuery(queryPar: QueryFilterItem<TModel, keyof TModel>): string {
		if (queryPar instanceof QueryFilterItemExpression) {
			return "(" + queryPar.toString() + ")";
		} else if (queryPar instanceof QueryFilterItemOr) {
			return "(" + toQueryString(queryPar.queryItems, "||") + ")";
		} else {
			return queryPar.field.toString() + "" + queryPar.operator + "" + toValueString(queryPar.value);
		}
	}

	return queryParameters.filter(hasNonEmptyValue).map(toStringQuery).join("  " + operator + "  ");
}

/**
 * Převede silně typovanou query na variantu pro přímé odeslání pomocí API
 */
function toQueryInternal<TModel>(query: Query<TModel>) {
	const queryInternal: QueryInternal = {
		...query,
		filter: query.filter ? toQueryString<TModel>(query!.filter!, "&") : undefined,
		sort_fields: query.sort_fields ? query.sort_fields.join(",") : undefined,
		sort_fields_desc: query.sort_fields_desc ? query.sort_fields_desc.join(",") : undefined
	};
	return queryInternal;
}

/**
 * Bázová třída pro zobrazení entity.
 */
export interface EntityReadBase {
	id: Id;
	system_information?: SystemInformation;
	deleted: boolean;
}

/**
 * Bázová třída pro editaci entity entity.
 */
export interface EntityUpdateBase {
	id: Id;
}

/**
 * Systémové informace (potenciálně součást každé třídy)
 */
export interface SystemInformation {
	creation: SystemInformationRecord;
	last_change: SystemInformationRecord;
}

export interface SystemInformationRecord {
	user: SystemInformationUser;
	date: Date;
}

/**
 * Uživatel v systémových informacích
 */
export interface SystemInformationUser {
	first_name: string;
	last_name: string;
	full_name: string;
}

/**
 * Číselníková položka
 */
export interface CodeBookItem {
	id: Id;
	name: string;
}

export interface CodeBookItemWithNumberId {
	id: number;
	name: string;
}

export interface CodeBookItemWithCode extends CodeBookItem {
	code: string;
}

export interface RequestOptions {
	suppressErrorNotification?: boolean;
	notificationInDialog?: boolean;
}

export function isOperationResponse(response: OperationResponse | any): response is OperationResponse {
	return (response as OperationResponse).messages !== undefined;
}

export function getErrorMessage(err: any, fallbackMessage: string) {
	return isOperationResponse(err) ? err.messages.map(i => i.message).join(". ") + "." : fallbackMessage;
}

function convertDates(data: any) {
	const dataParsed = JSON.parse(data, convertDateStringToDate);
	return dataParsed;
}

export function convertDateStringToDate(key: string, value: any) {
	const reCandidate = /\d{4}.*/;
	const reISO = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/;
	if (typeof value === "string") {
		if (reCandidate.test(value) && reISO.test(value)) {
			return new Date(value);
		}
	}
	return value;
}

/**
 * Parametry Standardního API pro entitu.
 */
export interface EntityApiOptions<EntityRead> {

	/**
	 * Api, které bude standardní API používat
	 */
	api: SpringRestApi;

	/**
	 * kořenové URL path pro entitu
	 */
	path: string;
}

/**
 * Model pro smazání záznamů
 */
export interface BulkDelete {
	ids: Id[];
}

/**
 * Model pro obnovení záznamů
 */
export interface BulkRestore {
	ids: Id[];
}

export interface ApiOptions {
	apiKey: string;
	endpoint: string;
}

export class SpringRestApi {
	private getAuthToken: () => Promise<string> = () => new Promise((resolve) => resolve(""));
	private rejectAuthToken: () => Promise<void> = () => new Promise((resolve) => resolve());

	constructor(public options: ApiOptions) {
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
	serverRequest = async <Request, Response>(
		path: string,
		method: HttpMethod,
		requestData?: Request,
		options?: RequestOptions & {
			downloadFileName?: string;
			returnsBlob?: boolean;
		}): Promise<Response> => {

		let requestIsFormData = requestData
			&& (requestData as any).constructor !== undefined
			&& (requestData as any).constructor.name == "FormData";

		let contentType: string = "application/x-www-form-urlencoded; charset=UTF-8";
		if ((method == "POST" || method == "PUT") && !requestIsFormData) {
			contentType = "application/json";
		}

		const headers: any = {};
		if (!requestIsFormData) {
			headers["Content-Type"] = contentType;
		}

		const authToken = await this.getAuthToken();
		if (authToken != "") {
			headers["Authorization"] = "Bearer " + authToken;
		}
		headers["X-API-Key"] = this.options.apiKey;

		const self = this;

		return new Promise(async function (resolve, reject) {
			async function handleError(response: AxiosResponse<OperationResponse> | undefined) {
				if (response?.status == 401) {
					await self.rejectAuthToken();
				}
				let message = "Nastala chyba komunikace se serverem.";

				if (response?.data) {
					message = response.data.messages.map(i => i.message).join(". ");
				} else if (response?.status) {
					message = "Při komunikaci se serverem nastala chyba č. " + response.status + ".";
				}

				if (options?.suppressErrorNotification !== true) {
					await notification.alert(message);
				}

				reject(response ? response.data as OperationResponse : <OperationResponse>{
					messages: [{
						type: ServerMessageType.Error,
						code: -1,
						message: "Nastala chyba komunikace se serverem"
					}],
					id: -1
				});
			}

			try {
				const response = await axios.request({
					method: method,
					url: self.options.endpoint + path,
					params: method === "GET" || method === "DELETE" ? requestData : undefined,
					data: method !== "GET" && method !== "DELETE" ? requestData : undefined,
					responseType: options?.downloadFileName || options?.returnsBlob ? "blob" : "text",
					headers,
					transformResponse: options?.downloadFileName || options?.returnsBlob ? undefined : [convertDates]
				});

				if (response.status >= 200 && response.status <= 299) {
					resolve(response.data as Response);
				} else {
					await handleError(response);
				}
			} catch (error) {
				await handleError(error.response);
			}
		});
	}

	/**
	 * Provede požadavek metodou GET
	 * 
	 * @param path 			URL path požadavku
	 * @param requestData 	Vstupní data (zasílaná jako QueryString)
	 */
	get<Response>(path: string): Promise<Response>;
	get<Response>(path: string, requestData: {}, options?: RequestOptions): Promise<Response>;
	get<Request, Response>(path: string, requestData?: Request, options?: RequestOptions): Promise<Response>;
	get<Request, Response>(path: string, requestData?: Request, options?: RequestOptions): Promise<Response> {
		return this.serverRequest(path, "GET", requestData, options);
	}

	/**
	 * Provede požadavek metodou POST
	 * 
	 * @param path 			URL path požadavku
	 * @param requestData  	Vstupní data (zasílaná jako JSON)
	 */
	post<Request, Response = OperationResponse>(path: string, requestData: Request, options?: RequestOptions): Promise<Response> {
		return this.serverRequest<Request, Response>(path, "POST", requestData, options);
	}

	/**
	 * Provede požadavek metodou PUT
	 * 
	 * @param path 			URL path požadavku
	 * @param requestData  	Vstupní data (zasílaná jako JSON)
	 */
	put<Request, Response = OperationResponse>(path: string, requestData: Request, options?: RequestOptions): Promise<Response> {
		return this.serverRequest<Request, Response>(path, "PUT", requestData, options);
	}

	/**
	 * Provede požadavek metodou DELETE
	 * 
	 * @param path 			URL path požadavku
	 * @param requestData 	Vstupní data (zasílaná jako QueryString)
	 */
	del<Response = OperationResponse>(path: string): Promise<Response>;
	del<Request, Response = OperationResponse>(path: string, requestData?: Request, options?: RequestOptions): Promise<Response>;
	del<Request, Response = OperationResponse>(path: string, requestData?: Request, options?: RequestOptions): Promise<Response> {
		return this.serverRequest<Request, Response>(path, "DELETE", requestData, options);
	}

	/**
	 * Provede download v samostatném okně prohlížeče metodou POST pod názvem fileName
	 * 
	 * @param path 			URL path požadavku
	 * @param fileName		Název downloadovaného souboru
	 *
	 * @param requestData 	Vstupní data (zasílaná jako QueryString)
	 */
	download<Request = {}>(path: string, fileName: string, requestData?: Request, options?: RequestOptions): Promise<void> {
		return this.serverRequest<Request, void>(path, "POST", requestData, { ...options, downloadFileName: fileName });
	}

	/**
	 * Vrací BLOB
	 * 
	 * @param path 			URL path požadavku
	 * @param requestData  	Vstupní data (zasílaná jako JSON)
	 */
	blob<Request>(path: string, requestData: Request, options?: RequestOptions): Promise<Blob> {
		return this.serverRequest<Request, Blob>(path, "POST", requestData, { ...options, returnsBlob: true });
	}

	/**
	 * Načte filtrovaný seznam
	 * 
	 * @param path 		URL path požadavku
	 * @param query		Dotaz na záznamy (filtr)
	 */
	loadList<Item>(path: string, query: Query<Item> = {}, options?: RequestOptions) {
		return this.post<QueryInternal, ListResponse<Item>>(path, toQueryInternal(query), options);
	}

	/**
	 * Stáhne filtrovaný seznam
	 * 
	 * @param path 		URL path požadavku
	 * @param query		Dotaz na záznamy (filtr)
	 * @param fileName	Název souboru po stažení
	 */
	downloadList<Item>(path: string, fileName: string, query: Query<Item> = {}, options?: RequestOptions) {
		return this.download(path, fileName, toQueryInternal(query), options);
	}

	setBindings(
		getAuthTokenFunc: () => Promise<string>,
		rejectAuthTokenFunc: () => Promise<void>) {
		this.getAuthToken = getAuthTokenFunc;
		this.rejectAuthToken = rejectAuthTokenFunc;
	}
}

/**
 * Standardní API pro entitu
 */
export class EntityApi<EntityRead extends EntityReadBase, EntityUpdate extends EntityUpdateBase> {

	constructor(public options: EntityApiOptions<EntityRead>) { }

	/**
	 * Načte konkrétní entitu.
	 */
	load = (id: Id): Promise<EntityRead> => {
		return this.options.api.get<{}, EntityRead>(this.options.path + "/" + id, {});
	}

	/**
	 * Vytvoří novou entitu.
	 */
	create = (entity: EntityUpdate) => {
		return this.options.api.put(this.options.path + "/0", entity);
	}

	/**
	 * Aktualizuje entitu.
	 */
	update = (entity: EntityUpdate) => {
		return this.options.api.put(this.options.path + "/" + entity.id, entity);
	}

	/**
	 * Odstraní entitu (resp. přesune ji do odstraněných)
	 */
	remove = (id: Id) => {
		return this.options.api.del(this.options.path + "/" + id);
	}

	/**
	 * Provede smazání jednoho nebo více záznamů.
	 */
	bulkRemove = (ids: Id[]) => {
		return this.options.api.post<Id[]>(this.options.path + "/bulk/delete", ids);
	}

	/**
	 * Obnoví záznam.
	 */
	restore = (id: Id) => {
		return this.options.api.post(this.options.path + "/" + id + "/restore", {});
	}

	/**
	 * Obnoví jeden nebo více záznamů.
	 */
	bulkRestore = (ids: Id[]) => {
		return this.options.api.post<Id[]>(this.options.path + "/bulk/restore", ids);
	}

	/**
	 * Načte seznam entit filtrovaný dotazem.
	 */
	loadList = (query: Query<EntityRead>) => {
		return this.options.api.loadList(this.options.path, query);
	}

	/**
	 * Stáhne seznam entit filtrovaný dotazem.
	 */
	downloadList = (query: Query<EntityRead>) => {
		return this.options.api.downloadList(this.options.path + "/export?file_type=xls", "seznam.xls", query);
	}
}
