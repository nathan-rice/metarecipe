/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/redux-form/redux-form.d.ts" />
/// <reference path="search.ts" />
/// <reference path="data.ts" />
/// <reference path="recipe-creator.ts" />

import Redux = require('redux');
import ReduxForm = require('redux-form');
import Search = require('search');
import Data = require('data');
import RecipeCreator = require('recipe-creator');

export const
    store = Redux.createStore(state => state),
    search = Search.RecipeSearchManager.create({getState: () => store.getState().search, store: store}) as Search.RecipeSearchManager,
    data = Data.DataServiceManager.create({getState: () => store.getState().data, store: store}) as Data.DataServiceManager,
    recipeCreator = new RecipeCreator.RecipeCreatorService(() => store.getState().recipeCreator, store);


export const reducers = {
    form: ReduxForm.reducer,
    search: search.reduce,
    data: data.reduce,
    recipeCreator: recipeCreator.reduce
};

store.replaceReducer(Redux.combineReducers(reducers));
