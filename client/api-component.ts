/// <reference path="definitions/redux/redux.d.ts" />

interface IEndpointInput {
    description?: string;
    converter?: (argumentValue) => string;
}

interface IEndpointBodyInput extends IEndpointInput {
    contentType: string;
    converter?: (bodyObject) => string;
    schema?: string;
}

interface IEndpointArgumentContainer {
    (key: string): IEndpointInput;
}

interface IEndpoint {
    url: string;
    method?: string;
    arguments?: IEndpointArgumentContainer;
    headers?: string[];
    body?: IEndpointBodyInput;
}

class Endpoint implements IEndpoint {
    url: string;
    method: string = "GET";
    arguments: IEndpointArgumentContainer;
    headers: string[];
    body: IEndpointBodyInput;

    constructor(config: IEndpoint) {
        if (config.method) this.method = config.method;
        if (config.arguments) this.arguments = config.arguments;
        if (config.body) this.body = config.body;
        if (config.headers) this.headers = config.headers;
        this.url = config.url;
    }
}

interface IAction {
    endpoint?: string | Function;
    initiator: Function;
    reducer?: Function | Function[];
    name: string;
    description?: string;
    defaultState: Object;
    getState?: Function;
}

interface IApiComponent {
    name: string;
    description?: string;
    parent?: Namespace;
    defaultState?: Object;
    store?: Redux.Store;
    getState?: Function;
}

class ApiComponent {
    name: string;
    description: string;
    parent: Namespace;
    defaultState: Object;
    store: Redux.Store;
    getState: Function = () => this.parent ? this.parent.getState()[this.parent.stateLocation(this)] : null;

    constructor(config: IApiComponent) {
        if (config.description) this.description = config.description;
        if (config.parent) this.parent = config.parent;
        if (config.getState) this.getState = config.getState;
        if (config.store) this.store = config.store;
        if (config.defaultState) this.defaultState = config.defaultState;
        this.name = config.name;
    }

    getStore(): Redux.Store {
        return this.store || this.parent.getStore();
    }

}

class Action extends ApiComponent implements IAction {
    endpoint: string | Function;
    initiator: Function = (action: Action) => action.getStore().dispatch({type: action.name});
    reducer: Function | Function[];

    constructor(config: IAction) {
        super(config);
        if (config.endpoint) this.endpoint = config.endpoint;
        if (config.reducer) this.reducer = config.reducer;
        this.initiator = config.initiator;
    }

    reduce: Function = (state, action) => {
        if (!state) {
            return this.defaultState;
        } else if (action.type != this.name || !this.reducer) {
            return state;
        } else {
            if (this.reducer instanceof Function) {
                return (this.reducer as Function)(state, action);
            } else {
                return (this.reducer as Function[]).reduce((s, f) => f(s, action), state);
            }
        }
    }
}

interface IComponentContainer {
    (key: string): ApiComponent;
}

interface INamespaceConfiguration extends IApiComponent {
    components?: IComponentMountConfiguration[];
    store?: Redux.Store;
}

interface IComponentMountConfiguration {
    location: string;
    component: ApiComponent;
    stateLocation?: string;
}

class Namespace extends ApiComponent {
    components: IComponentContainer | Object = {};
    defaultState = {};
    protected _stateLocation = {};

    constructor(config: INamespaceConfiguration) {
        super(config);
        if (config.components && config.components.length) {
            config.components.forEach(c => this.mount(c.location, c.component, c.stateLocation));
        }
    }

    protected updateDefaultState(stateLocation, state): Namespace {
        if (stateLocation) {
            this.defaultState[stateLocation] = state;
        } else {
            Object.apply(this.defaultState, state);
        }
        return this;
    }

    mount(location: string, component: ApiComponent, stateLocation?: string): Namespace {
        this.components[location] = component;
        if (component.defaultState) this.updateDefaultState(stateLocation, component.defaultState);
        if (stateLocation) {
            this._stateLocation[location] = stateLocation;
        }
        component.parent = this;
        if (component instanceof Action) {
            this[location] = component.initiator.bind(this, component);
        } else {
            this[location] = component;
        }
        return this;
    }

    unmount(location: string): Namespace {
        delete this.components[location].parent;
        delete this.components[location];
        delete this.defaultState[location];
        delete this[location];
        return this;
    }

    mountLocation(component: ApiComponent): string {
        for (let location in this.components) {
            if (component == this.components[location]) return location;
        }
        return null;
    }

    stateLocation(component: ApiComponent): string {
        var mountLocation = this.mountLocation(component);
        return this._stateLocation[mountLocation];
    }

    reduce(state, action) {
        if (!state) return this.defaultState;
        else {
            // applying to a new object here to retain state set by actions with a non-standard getState
            let newState = Object.apply({}, state), location, stateLocation;
            for (location in this.components) {
                stateLocation = this._stateLocation[location];
                if (stateLocation) {
                    newState[stateLocation] = this.components[location].reduce(state[stateLocation], action);
                } else {
                    newState = this.components[location].reduce(state, action)
                }
            }
            return newState;
        }
    }
}

interface ICollection<K, V> {
    get: (key: K) => V;
    set: (key: K, value: V) => ICollection<K, V>;
    merge: (...iterables: ICollection<K, V>[]) => ICollection<K, V>;
}

class CollectionAction extends Action {
    getState: Function = () => this.parent ? this.parent.getState().get(this.parent.stateLocation(this)) : null;
}

class CollectionNamespace extends Namespace {
    defaultState: ICollection<any, any>;
    getState: Function = () => this.parent ? this.parent.getState().get(this.parent.stateLocation(this)) : null;

    protected updateDefaultState(stateLocation, state: ICollection<any, any>): CollectionNamespace {
        if (stateLocation) {
            this.defaultState = this.defaultState.set(stateLocation, state);
        } else {
            this.defaultState = this.defaultState.merge(state);
        }
        return this;
    }

    reduce(state: ICollection<any, any>, action): ICollection<any, any> {
        if (!state) return this.defaultState;
        else {
            // applying to a new object here to retain state set by actions with a non-standard getState
            let location, stateLocation, reducer;
            for (location in this.components) {
                stateLocation = this._stateLocation[location];
                reducer = this.components[location].reduce;
                if (stateLocation) {
                    state = state.set(stateLocation, reducer(state.get(stateLocation), action));
                } else {
                    state = reducer(state, action);
                }
            }
            return state;
        }
    }
}