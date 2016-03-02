/// <reference path="definitions/redux/redux.d.ts" />

interface IReduxAction {
    type: string;
}

interface IEndpointInput {
    description?: string;
    converter?: (argumentValue) => string;
}

interface IEndpointBodyInput extends IEndpointInput {
    contentType?: string;
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
    endpoint?: Endpoint | string;
    initiator?: Function;
    reducer?: ((state, action: IReduxAction) => Object) | ((state, action: IReduxAction) => Object)[];
    name?: string;
    description?: string;
    defaultState?: Object;
    getState?: Function;
}

interface IApiComponent {
    name?: string;
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
    getState: Function = () => {
        if (!this.parent) return null;
        else return this._get(this.parent.getState(), this.parent.stateLocation(this));
    };

    protected _get(state, location) {
        if (location) return state[location];
        else return state;
    }

    constructor(config: IApiComponent) {
        if (config.description) this.description = config.description;
        if (config.parent) this.parent = config.parent;
        if (config.getState) this.getState = config.getState;
        if (config.store) this.store = config.store;
        if (config.defaultState) this.defaultState = config.defaultState;
        if (config.name) this.name = config.name;
    }

    getStore(): Redux.Store {
        return this.store || this.parent.getStore();
    }

}

class Action extends ApiComponent implements IAction {
    endpoint: Endpoint;
    initiator: Function = (action: Action) => action.getStore().dispatch({type: action.name});
    reducer: ((state, action: IReduxAction) => Object) | ((state, action: IReduxAction) => Object)[];

    constructor(config: IAction | Function) {
        super(config);
        if (config instanceof Function) {
            this.initiator = config;
        }
        else {
            let endpoint = (config as IAction).endpoint;
            if (endpoint) {
                if (typeof endpoint === "string") {
                    this.endpoint = new Endpoint({url: endpoint});
                } else {
                    this.endpoint = endpoint;
                }
            }
            if ((config as IAction).reducer) this.reducer = (config as IAction).reducer;
            this.initiator = (config as IAction).initiator;
        }
    }

    reduce: Function = (state, action) => {
        if (!state) {
            return this.defaultState;
        } else if (action.type != this.name || !this.reducer) {
            return state;
        } else {
            if (this.reducer instanceof Function) {
                return (this.reducer as (state, action: IReduxAction) => Object)(state, action);
            } else {
                return (this.reducer as ((state, action: IReduxAction) => Object)[]).reduce((s, f) => f(s, action), state);
            }
        }
    }
}

interface IComponentContainer {
    [key: string]: ApiComponent;
}

interface INamespaceConfiguration extends IApiComponent {
    components?: IComponentMountConfiguration[] | IComponentContainer;
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
        if (config.components) {
            this.mountAll(config.components);
        }
    }

    protected updateDefaultState(stateLocation, state): Namespace {
        if (stateLocation) {
            this.defaultState[stateLocation] = state;
        } else {
            for (let key in state) {
                this.defaultState[key] = state[key];
            }
        }
        return this;
    }

    mount(location: string, component: ApiComponent, stateLocation?: string): Namespace {
        this.components[location] = component;
        component.parent = this;
        if (component.defaultState) this.updateDefaultState(stateLocation, component.defaultState);
        if (component instanceof Action) {
            // Actions with an undefined state location operate on the parent Namespace's entire state
            this._stateLocation[location] = stateLocation;
            this[location] = component.initiator.bind(this, component);
        } else {
            // Namespaces *must* have a state location, we'll use the mount location if necessary
            this._stateLocation[location] = stateLocation || location;
            this[location] = component;
        }
        return this;
    }

    mountAll(components: IComponentMountConfiguration[] | IComponentContainer) {
        if ((components as IComponentMountConfiguration[]).length) {
            (components as IComponentMountConfiguration[])
                .forEach(c => this.mount(c.location, c.component, c.stateLocation));
        } else {
            for (let location in components) {
                this.mount(location, components[location]);
            }
        }
    }

    unmount(location: string): Namespace {
        this.components[location].parent = undefined;
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
            let newState = {}, location, stateLocation;
            for (let key in state) {
                newState[key] = state[key];
            }
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
    defaultState: ICollection<any, any>;
    reducer: (state: ICollection<any, any>, action: IReduxAction) => ICollection<any, any> |
        ((state: ICollection<any, any>, action: IReduxAction) => ICollection<any, any>)[];

    protected _get(state, location) {
        if (location) return state.get(location);
        else return state;
    }
}

class CollectionNamespace extends Namespace {
    defaultState: ICollection<any, any>;

    protected _get(state, location) {
        if (location) return state.get(location);
        else return state;
    }

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