/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/redux-form/redux-form.d.ts" />

import Redux = require('redux');
import Immutable = require('immutable');
import reduxForm = require('redux-form');
import jQuery = require('jquery');

const endpoints = {
    search: {
        bySite: {
            foodNetwork: "/search/by_site/food_network/",
            foodCom: "/search/by_site/food_com/"
        },
        retrieve: "/search/retrieve"
    }
};

const actions = {
    search: {
        bySite: {
            foodCom: {
                update: 'FOOD.COM_UPDATE_RESULTS',
                toggleRetrieval: 'FOOD.COM_MARK_FOR_RETRIEVAL'

            },
            foodNetwork: {
                update: 'FOOD_NETWORK_UPDATE_RESULTS',
                toggleRetrieval: 'FOOD_NETWORK_MARK_FOR_RETRIEVAL'
            }
        },
        retrieve: 'RETRIEVE_SEARCH_RESULTS_DOCUMENTS'
    }

};

function getInitialState() {
    return Immutable.fromJS({
        search: {
            bySite: {
                food_com: {results: [], retrieve: {}, next_page: 1},
                food_network: {results: [], retrieve: {}, next_page: 1}
            },
            retrieve: []
        },

    })
}

const reducers = {
    search: function (state: Immutable.Map<string, any>, action) {
        var results;
        if (!state) {
            state = getInitialState();
        }
        switch (action.type) {
            case actions.search.bySite.foodCom.update:
                results = Immutable.List(action.results.map(RecipeSearchResult.fromArray));
                if (action.nextPage > 1) {
                    results = state.getIn(["search", "bySite", "food_com", "results"]).concat(results);
                }
                return state
                    .mergeIn(["search", "bySite", "food_com", "results"], results)
                    .updateIn(["search", "bySite", "food_com", "next_page"], () => action.nextPage);
            case actions.search.bySite.foodCom.toggleRetrieval:
                return state
                    .updateIn(["search", "bySite", "food_com", "retrieve", action.recipe.url], (val) => !val);
            case actions.search.bySite.foodNetwork.update:
                results = Immutable.List(action.results.map(RecipeSearchResult.fromArray));
                if (action.nextPage > 1) {
                    results = state.getIn(["search", "bySite", "food_network", "results"]).concat(results);
                }
                return state
                    .mergeIn(["search", "bySite", "food_network", "results"], results)
                    .updateIn(["search", "bySite", "food_network", "next_page"], () => action.nextPage);
            case actions.search.bySite.foodNetwork.toggleRetrieval:
                return state
                    .updateIn(["search", "bySite", "food_network", "retrieve", action.recipe.url], (val) => !val);
            case actions.search.retrieve:
                results = state.getIn(["search", "retrieve"]).concat(action.recipe_documents);
                return state
                    .mergeIn(["search", "retrieve"], results)
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

export class RecipeSearch {
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

    taggedForRetrieval(): RecipeSearchResult[] {
        return this.getState().get("results").filter(r => this.getState().get("retrieve").get(r.url));
    }
}

const FoodNetworkRecipeSearch = new RecipeSearch(
    endpoints.search.bySite.foodNetwork,
    actions.search.bySite.foodNetwork,
    () => store.getState().search.get("search").get("bySite").get("food_network")
);


const FoodComRecipeSearch = new RecipeSearch(
    endpoints.search.bySite.foodCom,
    actions.search.bySite.foodCom,
    () => store.getState().search.get("search").get("bySite").get("food_com")
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

class SearchResultRetriever {

    constructor() {
        this.retrieveSelected = this.retrieveSelected.bind(this);
    }

    retrieveSelected() {
        let site, retrieve = [], tagged;
        for (site in search.bySite) {
            tagged = search.bySite[site].taggedForRetrieval();
            retrieve = retrieve.concat(tagged.toJS());
        }
        return this.retrieve(retrieve);
    }

    retrieve(results: RecipeSearchResult[]) {
        jQuery.ajax({
            type: "POST",
            url: endpoints.search.retrieve,
            data: JSON.stringify(results),
            contentType: "application/json; charset=utf-8"
        }).then(data => store.dispatch({type: actions.search.retrieve, recipe_documents: data.recipe_documents}));
    }
}

class RecipeDocumentService {
    getWords() {

    }
}

class RecipeDocumentWord {

}

export const search = {
    bySite: {
        foodCom: FoodComRecipeSearch,
        foodNetwork: FoodNetworkRecipeSearch
    },
    retrieve: new SearchResultRetriever()
};