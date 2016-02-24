/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />

import Immutable = require('immutable');


export class RecipeCreatorService {

    defaultState = Immutable.fromJS({});

    reduce(state: Immutable.Map<string, any>, action): Immutable.Map<any, any> {
        if (!state) {
            return this.defaultState;
        }
        return state;
    }

    protected setBindings() {
        this.reduce = this.reduce.bind(this);
    }

    constructor(protected getState: Function, public store: Redux.Store) {
        this.setBindings();
    }
}