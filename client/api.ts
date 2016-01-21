/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/redux-form/redux-form.d.ts" />
/// <reference path="search.ts" />
/// <reference path="crud.ts" />

import Redux = require('redux');
import ReduxForm = require('redux-form');
import Search = require('search');
import Crud = require('crud');

export const
    store: Redux.Store = Redux.createStore(state => state),
    search: Search.RecipeSearchManager = new Search.RecipeSearchManager(() => store.getState().search, store),
    crud: Crud.ObjectManager = new Crud.ObjectManager(() => store.getState().crud, store);

const reducers = {
    form: ReduxForm.reducer,
    search: search.reduce,
    crud: crud.reduce
};

store.replaceReducer(Redux.combineReducers(reducers));
