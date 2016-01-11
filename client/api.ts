/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/redux-form/redux-form.d.ts" />

import Redux = require('redux');
import Immutable = require('immutable');
import reduxForm = require('redux-form');

const endpoints = {
    search: {
        bySite: {
            foodNetwork: "/search/by_site/food_network/",
            foodCom: "/search/by_site/food_com/"
        },
        retrieve: "/search/retrieve_results"
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
        var results;
        if (!state) {
            state = getInitialState();
        }
        switch (action.type) {
            case actions.search.foodCom.update:
                results = Immutable.List(action.results.map(RecipeSearchResult.fromArray));
                if (action.nextPage > 1) {
                    results = state.getIn(["search", "food_com", "results"]).concat(results);
                }
                return state
                    .mergeIn(["search", "food_com", "results"], results)
                    .updateIn(["search", "food_com", "next_page"], () => action.nextPage);
            case actions.search.foodCom.toggleRetrieval:
                return state
                    .updateIn(["search", "food_com", "retrieve", action.recipe.url], (val) => !val);
            case actions.search.foodNetwork.update:
                results = Immutable.List(action.results.map(RecipeSearchResult.fromArray));
                if (action.nextPage > 1) {
                    results = state.getIn(["search", "food_network", "results"]).concat(results);
                }
                return state
                    .mergeIn(["search", "food_network", "results"], results)
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

interface searchActions {
    update: string,
    toggleRetrieval: string
}

class RecipeSearch {
    constructor(private endpoint: string, private actions: searchActions, private getState: Function) {
        this.loadNextSearchPage = this.loadNextSearchPage.bind(this);
    };

    search(searchTerm: string, page: number = 1): JQueryPromise<any> {
        return jQuery.getJSON(this.endpoint, {search: searchTerm, page: page}).then((data) => {
            store.dispatch({type: this.actions.update, results: data.results, nextPage: data.next_page});
        });
    }

    loadNextSearchPage() {
        return this.search(this.getSearchTerm(), this.getNextPage());
    }

    getSearchTerm(): string {
        return store.getState().form.search.searchTerm.value;
    }

    getNextPage(): number {
        return this.getState().get("next_page");
    }

    getResults(): RecipeSearchResult[] {
        return this.getState().get("results");
    }

    toggleRetrieval(recipe: RecipeSearchResult) {
        store.dispatch({type: this.actions.toggleRetrieval, recipe: recipe})
    }

    shouldRetrieve(recipe: RecipeSearchResult): boolean {
        return this.getState().get("retrieve").get(recipe.url);
    }
}

const FoodNetworkRecipeSearch = new RecipeSearch(
    endpoints.search.bySite.foodNetwork,
    actions.search.foodNetwork,
    () => store.getState().search.get("search").get("food_network")
);


const FoodComRecipeSearch = new RecipeSearch(
    endpoints.search.bySite.foodCom,
    actions.search.foodCom,
    () => store.getState().search.get("search").get("food_com")
);

export class RecipeSearchResult {
    static fromImmutableMap(immutableMap): RecipeSearchResult {
        let title = immutableMap.get(0),
            author = immutableMap.get(1),
            url = immutableMap.get(2),
            id = immutableMap.get(3);
        return new RecipeSearchResult(title, author, url, id)
    }

    static fromArray(array): RecipeSearchResult {
        let title = array[0],
            author = array[1],
            url = array[2],
            id = array[3];
        return new RecipeSearchResult(title, author, url, id);
    }

    constructor(public title, public author, public url, public id) {
    }
}

export const search = {
    foodCom: FoodComRecipeSearch,
    foodNetwork: FoodNetworkRecipeSearch
};