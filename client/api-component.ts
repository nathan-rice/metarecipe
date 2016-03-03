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

export class Endpoint implements IEndpoint {
    url: string;
    method: string = "GET";
    arguments: IEndpointArgumentContainer;
    headers: string[];
    body: IEndpointBodyInput;

    configure(config: IEndpoint) {
        if (config.method) this.method = config.method;
        if (config.arguments) this.arguments = config.arguments;
        if (config.body) this.body = config.body;
        if (config.headers) this.headers = config.headers;
        this.url = config.url;
        return this;
    }

    constructor(config: IEndpoint) {
        this.configure(config);
    }
}

interface IApiComponent {
    name?: string;
    description?: string;
    parent?: Namespace;
    defaultState?: Object;
    store?: Redux.Store;
    getState?: Function;
}

interface IAction extends IApiComponent {
    endpoint?: Endpoint | string;
    initiator?: Function;
    reducer?: ((state, action: IReduxAction) => Object) | ((state, action: IReduxAction) => Object)[];
}

export class ApiComponent {
    name: string;
    description: string;
    parent: Namespace;
    defaultState: Object;
    store: Redux.Store;
    reduce: Function;

    getState: Function = () => {
        if (!this.parent) return null;
        else return this._get(this.parent.getState(), this.parent.stateLocation(this));
    };

    protected _get(state, location) {
        if (location) return state[location];
        else return state;
    }

    configure(config?: IApiComponent) {
        if (config) {
            if (config.description) this.description = config.description;
            if (config.parent) this.parent = config.parent;
            if (config.getState) this.getState = config.getState;
            if (config.store) this.store = config.store;
            if (config.defaultState) this.defaultState = config.defaultState;
            if (config.name) this.name = config.name;
        }
        return this;
    }

    static create(config?) {
        return new this().configure(config);
    }

    getStore(): Redux.Store {
        return this.store || this.parent.getStore();
    }

}

export class Action extends ApiComponent implements IAction, Function {

    endpoint: Endpoint;

    initiator: Function = function(action: Action, data) {
        let reduxAction = {type: action.name}, key;
        for (key in data) {
            reduxAction[key] = data[key];
        }
        action.getStore().dispatch(reduxAction);
        return this;
    };

    reducer: ((state, action: IReduxAction) => Object) | ((state, action: IReduxAction) => Object)[];

    /*
     * Required in order to masquerade as a function for the purpose of type checking
     */
    apply = (thisArg: any, argArray?: any) => this.initiator.apply(thisArg, argArray);
    call = (thisArg: any, ...argArray: any[]) => this.initiator.call(thisArg, ...argArray);
    bind = (thisArg: any, ...argArray: any[]) => this.initiator.bind(thisArg, ...argArray);
    prototype: any;
    length: number;
    arguments: any;
    caller: Function;

    configure(config?: IAction | Function) {
        if (config) {
            if (config instanceof Function) {
                this.initiator = config;
            }
            else {
                let conf: IAction = config;
                super.configure(conf);
                let endpoint = conf.endpoint;
                if (endpoint) {
                    if (typeof endpoint === "string") {
                        this.endpoint = new Endpoint({url: endpoint});
                    } else {
                        this.endpoint = endpoint;
                    }
                }
                if (conf.reducer) this.reducer = conf.reducer;
                if (conf.initiator) this.initiator = conf.initiator;
            }
        }
        return this;
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

export class Namespace extends ApiComponent {
    components: IComponentContainer | Object = {};
    defaultState = {};
    protected _stateLocation = {};

    configure(config?: INamespaceConfiguration) {
        super.configure(config);
        for (let key in this) {
            // This ensures consistent behavior for ApiComponents defined on a namespace as part of a class declaration
            if (this[key] instanceof ApiComponent && !this.mountLocation(this[key])) this.mount(key, this[key]);
        }
        if (config && config.components) {
            this.mountAll(config.components);
        }
        return this;
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
        if (component instanceof Action) {
            // Actions with an undefined state location operate on the parent Namespace's entire state
            this._stateLocation[location] = stateLocation;
            this[location] = component.initiator.bind(this, component);
        } else {
            // Namespaces *must* have a state location, we'll use the mount location if necessary
            this._stateLocation[location] = stateLocation || location;
            this[location] = component;
        }
        if (component.defaultState) this.updateDefaultState(this._stateLocation[location], component.defaultState);
        return this;
    }

    mountAll(components: IComponentMountConfiguration[] | IComponentContainer) {
        let key, component;
        for (key in components) {
            component = components[key];
            if (component instanceof ApiComponent) {
                this.mount(key, component);
            } else {
                this.mount(component.location, component.component, component.stateLocation)
            }
        }
        return this;
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

    reduce = (state, action) => {
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

export class CollectionAction extends Action {
    defaultState: ICollection<any, any>;
    reducer: (state: ICollection<any, any>, action: IReduxAction) => ICollection<any, any> |
        ((state: ICollection<any, any>, action: IReduxAction) => ICollection<any, any>)[];

    protected _get(state, location) {
        if (location) return state.get(location);
        else return state;
    }
}

export class CollectionNamespace extends Namespace {
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

    reduce = (state: ICollection<any, any>, action): ICollection<any, any> => {
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