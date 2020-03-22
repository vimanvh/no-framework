/**
 * State management pro reaktivní UI.
 */

/**
 * Předpis metody pro transformaci původního stavu na nový parciální.
 */
export interface TransformMethod<State> {
	(prevState: State): Partial<State>;
}

/**
 * State container uchovává stavové informace, změny stavu jsou immutabilní,
 * umožňuje napojení se na stav React komponenty.
 */
export class StateContainer<State> {

	/**
	 * Zde je uložen stav i v případě, pokud kontejner není napojen na 
	 * žádnou React komponentu.
	 */
	internalState: State;

	/**
	 * React komponenta, na níž je kontejner napojen. Pokud dojde ke změně
	 * stavu, tak dojde k aktualizaci (rekonciliaci) této vizuální komponenty.
	 */
	reactComponent?: React.Component;

	constructor(defaultState: State) {
		this.internalState = defaultState;
	}

	/**
	 * Připojí kontejner k dané React komponentě. 
	 * 
	 * @param  {React.Component} reactComponent React komponenta
	 */
	bind = (reactComponent: React.Component): void => {
		this.reactComponent = reactComponent;
		reactComponent.state = this.internalState;
	}

	/**
	 * Odpojí kontejner od react komponenty. Pokud je stávající stav
	 * napojen na jinou komponentu, než reactComponent, neprovede nic.
	 */
	unbind = (reactComponent: React.Component): void => {
		if (reactComponent === this.reactComponent) {
			this.reactComponent = undefined;
		}
	}

	/**
	 * Vrací stav.
	 */
	get = (): State => {
		if (this.reactComponent === undefined)
			return this.internalState;

		return this.reactComponent.state as State;
	}

	/**
	 * Aktualizuje stav pomocí transformační metody. Transformační metoda musí vracet 
	 * nový stav na základě předchozího stavu a vstupu jako immutable objekt. 
	 * V opačném případě by bylo narušeno korektní reaktivní fungování.
	 * 
	 * @param  {TransformMethod} transformMethod Metoda pro transformaci na nový stav
	 */
	merge = async (transformMethod: TransformMethod<State>): Promise<void> => {
		const newState = transformMethod(this.internalState);
		Object.assign(this.internalState, newState);

		if (this.reactComponent === undefined)
			return;

		return new Promise<void>((resolve) => {
			if (this.reactComponent !== undefined) {
				this.reactComponent.setState(newState, resolve);
			}
		});
	}
}