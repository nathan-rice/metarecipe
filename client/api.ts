/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/redux-form/redux-form.d.ts" />

import Redux = require('redux');
import Immutable = require('immutable');
import reduxForm = require('redux-form');

const endpoints = {
    search: {
        foodNetwork: "/search/food_network/",
        foodCom: "/search/food_com/"
    }
};

const actions = {
    search: {
        foodCom: {
            update: 'FOOD.COM_UPDATE_RESULTS',
            toggleRetrieval: 'FOOD.COM_MARK_FOR_RETRIEVAL'

        },
        foodNetwork: {
            update: 'FOOD_NETWORK_UPDATE_RESULTS',
            toggleRetrieval: 'FOOD_NETWORK_MARK_FOR_RETRIEVAL'
        }
    }
};

function getInitialState() {
    return Immutable.fromJS({
        search: {
            food_com: {results: [], retrieve: {}, next_page: 1},
            food_network: {results: [], retrieve: {}, next_page: 1}
        }
    })
}

const reducers = {
    search: function (state: Immutable.Map<string, any>, action) {
        if (!state) {
            state = getInitialState();
        }
        switch (action.type) {
            case actions.search.foodCom.update:
                return state
                    .mergeIn(["search", "food_com", "results"], action.results)
                    .updateIn(["search", "food_com", "next_page"], () => action.nextPage);
            case actions.search.foodCom.toggleRetrieval:
                return state
                    .updateIn(["search", "food_com", "retrieve", action.recipe.url], (val) => !val);
            case actions.search.foodNetwork.update:
                return state
                    .mergeIn(["search", "food_network", "results"], action.results)
                    .updateIn(["search", "food_network", "next_page"], () => action.nextPage);
            case actions.search.foodNetwork.toggleRetrieval:
                return state
                    .updateIn(["search", "food_com", "retrieve", action.recipe.url], (val) => !val);
        }
        return state;
    },
    form: reduxForm.reducer
};

const reducer = Redux.combineReducers(reducers);

export const store = Redux.createStore(reducer);

class FoodNetworkRecipeSearch {
    static search(searchTerm: string, page: number = 1): JQueryPromise<any> {
        return jQuery.getJSON(endpoints.search.foodNetwork, {search: searchTerm, page: page}).then((data) => {
            store.dispatch({type: actions.search.foodNetwork.update, results: data.results, nextPage: data.next_page});
        });
    }

    static getResults(): RecipeSearchResult[] {
        let state = store.getState();
        let networkState = state.search.get("search").get("food_network");
        let results = networkState.get("results");
        let resultsObjects = results.map(RecipeSearchResult.fromImmutableMap);
        return resultsObjects.toJS();
    }

    static markRecipeForRetrieval(recipe: RecipeSearchResult) {

    }
}

class FoodComRecipeSearch {

    static getResults(): RecipeSearchResult[] {
        let state = store.getState();
        let networkState = state.search.get("search").get("food_com");
        let results = networkState.get("results");
        let resultsObjects = results.map(RecipeSearchResult.fromImmutableMap);
        return resultsObjects.toJS();
    }

    static search(searchTerm: string, page: number = 1): JQueryPromise<any> {
        return jQuery.getJSON(endpoints.search.foodCom, {search: searchTerm, page: page}).then((data) => {
            store.dispatch({type: actions.search.foodCom.update, results: data.results, nextPage: data.next_page});
        });
    }

}

export class RecipeSearchResult {

    static fromImmutableMap(immutableMap): RecipeSearchResult {
        let title = immutableMap.get(0),
            author = immutableMap.get(1),
            url = immutableMap.get(2);
        return new RecipeSearchResult(title, author, url)
    }

    constructor(public title, public author, public url) {
    }
}

export var search = {
    foodCom: FoodComRecipeSearch,
    foodNetwork: FoodNetworkRecipeSearch
};