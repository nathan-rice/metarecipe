/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/redux-form/redux-form.d.ts" />
/// <reference path="search.ts" />
/// <reference path="crud.ts" />


import Redux = require('redux');
import Immutable = require('immutable');
import reduxForm = require('redux-form');
import jQuery = require('jquery');

const endpoints = {
    crud: {
        recipeDocument: {
            get: (documentId: number) => "/crud/recipe_document/" + documentId + "/",
            getWords: (documentId: number) => "/crud/recipe_document/" + documentId + "/words/"
        }
    }
};

const reducers = {form: reduxForm.reducer},
    reducer = Redux.combineReducers(reducers),
    store = Redux.createStore(reducer);

export const
    search = new search.RecipeSearchManager(() => store.getState().search, store),
    crud = new crud.ObjectManager(() => store.getState().crud, store);