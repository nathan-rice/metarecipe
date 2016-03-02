/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/redux-form/redux-form.d.ts" />
/// <reference path="search.ts" />
/// <reference path="crud.ts" />
/// <reference path="recipe-creator.ts" />

import Redux = require('redux');
import ReduxForm = require('redux-form');
import Search = require('search-new');
import Crud = require('crud');
import RecipeCreator = require('recipe-creator');

export const
    store = Redux.createStore(state => state),
    search = new Search.RecipeSearchManager({getState: () => store.getState().search, store: store}),
    crud = new Crud.ObjectManager(() => store.getState().crud, store),
    recipeCreator = new RecipeCreator.RecipeCreatorService(() => store.getState().recipeCreator, store);


export const reducers = {
    form: ReduxForm.reducer,
    search: search.reduce,
    crud: crud.reduce,
    recipeCreator: recipeCreator.reduce
};

store.replaceReducer(Redux.combineReducers(reducers));
