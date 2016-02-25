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
    body?: IEndpointBodyInput;
}

class Endpoint implements IEndpoint {
    arguments: IEndpointArgumentContainer;
    url: string;
    method: string = "GET";
    body: IEndpointBodyInput;

    constructor(config: IEndpoint) {
        if (config.method) this.method = config.method;
        if (config.arguments) this.arguments = config.arguments;
        if (config.body) this.body = config.body;
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

abstract class Action implements IAction {
    endpoint: string | Function;
    initiator: Function;
    reducer: Function | Function[];
    name: string;
    description: string;
    defaultState: Object;
    getState: Function;
    parent: ApiComponent;

    constructor(config: IAction) {
        if (config.endpoint) this.endpoint = config.endpoint;
        if (config.reducer) this.reducer = config.reducer;
        if (config.description) this.description = config.description;
        if (config.getState) this.getState = config.getState;
        this.initiator = config.initiator;
        this.name = config.name;
        this.defaultState = config.defaultState;
    }

    reduce(state, action) {
        if (!state) {
            return this.defaultState;
        } else if (action.type != this.name) {
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
    (key: string): Action | ApiComponent;
}

abstract class ApiComponent {
    private subComponents: IComponentContainer | Object = {};
    name: string;
    description: string;
    parent: ApiComponent;

    mount(location: string, subComponent: Action | ApiComponent) {
        this.subComponents[location] = subComponent;
        if (subComponent instanceof Action) {
            this[location] = subComponent.initiator;
        } else {
            this[location] = subComponent;
        }
        return this;
    }

    unmount(location: string) {
        delete this.subComponents[location];
        delete this[location];
        return this;
    }

    reduce(state, action) {
        var newState = {};
        for (let component in this.subComponents) {
            newState[component] = this.subComponents[component].reduce(state[component], action);
        }
        return newState;
    }
}