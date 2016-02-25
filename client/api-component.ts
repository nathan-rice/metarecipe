interface IEndpointInput {
    description?: string;
    converter?: (argumentValue) => string;
}

interface IEndpointBodyInput extends IEndpointInput {
    contentType: string;
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

class ComposableComponent {
    name: string;
    description: string;
    parent: ApiComponent;
    defaultState: Object;
    getState: Function = () => this.parent ? this.parent.getState()[this.parent.stateLocation(this)] : null;
}

class Action extends ComposableComponent implements IAction {
    endpoint: string | Function;
    initiator: Function;
    reducer: Function | Function[];

    constructor(config: IAction) {
        super();
        if (config.endpoint) this.endpoint = config.endpoint;
        if (config.reducer) this.reducer = config.reducer;
        if (config.description) this.description = config.description;
        if (config.getState) this.getState = config.getState;
        this.initiator = config.initiator;
        this.name = config.name;
        this.defaultState = config.defaultState;
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
    (key: string): ComposableComponent;
}

class ApiComponent extends ComposableComponent {
    components: IComponentContainer | Object = {};
    private _stateLocation = {};

    mount(location: string, component: ComposableComponent, stateLocation?: string) {
        this.components[location] = component;
        this.defaultState[location] = component.defaultState;
        if (stateLocation) {
            this._stateLocation[location] = stateLocation;
        }
        component.parent = this;
        if (component instanceof Action) {
            this[location] = component.initiator;
        } else {
            this[location] = component;
        }
        return this;
    }

    unmount(location: string) {
        delete this.components[location].parent;
        delete this.components[location];
        delete this.defaultState[location];
        delete this[location];
        return this;
    }

    mountLocation(component: ComposableComponent) {
        for (let location in this.components) {
            if (component == this.components[location]) return location;
        }
        return null;
    }

    stateLocation(component: ComposableComponent) {
        var mountLocation = this.mountLocation(component);
        return this._stateLocation[mountLocation] || mountLocation;
    }

    reduce(state, action) {
        if (!state) return this.defaultState;
        else {
            // applying to a new object here to retain state set by actions with a non-standard getState
            let newState = Object.apply({}, state), location, stateLocation;
            for (location in this.components) {
                stateLocation = this._stateLocation[location] || location;
                newState[stateLocation] = this.components[location].reduce(state[stateLocation], action);
            }
            return newState;
        }
    }
}