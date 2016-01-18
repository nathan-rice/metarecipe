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
    },
    crud: {
        recipeDocument: {
            get: (documentId: number) => "/crud/recipe_document/" + documentId + "/",
            getWords: (documentId: number) => "/crud/recipe_document/" + documentId + "/words/"
        }
    }
};

const actions = {
    search: {
        bySite: {
            foodCom: {
                update: 'FOOD.COM_UPDATE_RESULTS',
                toggleRetrieval: 'FOOD.COM_MARK_FOR_RETRIEVAL',
                retrieveAll: 'FOOD.COM_MARK_ALL_FOR_RETRIEVAL',
                retrieveNone: 'FOOD.COM_MARK_NONE_FOR_RETRIEVAL'

            },
            foodNetwork: {
                update: 'FOOD_NETWORK_UPDATE_RESULTS',
                toggleRetrieval: 'FOOD_NETWORK_MARK_FOR_RETRIEVAL',
                retrieveAll: 'FOOD_NETWORK_MARK_ALL_FOR_RETRIEVAL',
                retrieveNone: 'FOOD_NETWORK_MARK_NONE_FOR_RETRIEVAL'
            }
        },
        retrieve: 'RETRIEVE_SEARCH_RESULTS_DOCUMENTS'
    },
    crud: {
        recipeDocument: {
            get: 'GET_RECIPE_DOCUMENT',
            getWords: 'GET_RECIPE_DOCUMENT_WORDS'
        }
    }

};

function getInitialState() {
    return Immutable.fromJS({
        search: {
            bySite: {
                foodCom: {results: [], retrieve: {}, next_page: 1},
                foodNetwork: {results: [], retrieve: {}, next_page: 1}
            },
            retrieve: []
        },
        documents: {}
    })
}

const reducers = {
    search: function (state: Immutable.Map<string, any>, action) {
        var results, urlTuples, retrieve;
        if (!state) {
            state = getInitialState();
        }
        switch (action.type) {
            case actions.search.bySite.foodCom.update:
                results = Immutable.List(action.results.map(RecipeSearchResult.fromArray));
                if (action.nextPage > 1) {
                    let oldResults = state.getIn(["search", "bySite", "foodCom", "results"]),
                        oldResultsIds = Immutable.Set(oldResults.map(result => result.url)),
                        newResultsOnly = results.filter(result => !oldResultsIds.contains(result.url));
                    results = oldResults.concat(newResultsOnly);
                }
                return state
                    .mergeIn(["search", "bySite", "foodCom", "results"], results)
                    .setIn(["search", "bySite", "foodCom", "next_page"], action.nextPage);
            case actions.search.bySite.foodCom.toggleRetrieval:
                return state
                    .updateIn(["search", "bySite", "foodCom", "retrieve", action.recipe.url], val => !val);
            case actions.search.bySite.foodCom.retrieveAll:
                urlTuples = state.getIn(["search", "bySite", "foodCom", "results"]).map(result => [result.url, true]);
                retrieve = Immutable.Map(urlTuples);
                return state.setIn(["search", "bySite", "foodCom", "retrieve"], retrieve);
            case actions.search.bySite.foodCom.retrieveNone:
                return state.setIn(["search", "bySite", "foodCom", "retrieve"], Immutable.Map());
            case actions.search.bySite.foodNetwork.update:
                results = Immutable.List(action.results.map(RecipeSearchResult.fromArray));
                if (action.nextPage > 1) {
                    let oldResults = state.getIn(["search", "bySite", "foodNetwork", "results"]),
                        oldResultsIds = Immutable.Set(oldResults.map(result => result.url)),
                        newResultsOnly = results.filter(result => !oldResultsIds.contains(result.url));
                    results = oldResults.concat(newResultsOnly);
                }
                return state
                    .mergeIn(["search", "bySite", "foodNetwork", "results"], results)
                    .setIn(["search", "bySite", "foodNetwork", "next_page"], action.nextPage);
            case actions.search.bySite.foodNetwork.toggleRetrieval:
                return state
                    .updateIn(["search", "bySite", "foodNetwork", "retrieve", action.recipe.url], val => !val);
            case actions.search.bySite.foodNetwork.retrieveAll:
                urlTuples = state.getIn(["search", "bySite", "foodNetwork", "results"]).map(result => [result.url, true]);
                retrieve = Immutable.Map(urlTuples);
                return state.setIn(["search", "bySite", "foodNetwork", "retrieve"], retrieve);
            case actions.search.bySite.foodNetwork.retrieveNone:
                return state.setIn(["search", "bySite", "foodNetwork", "retrieve"], Immutable.Map());
            case actions.search.retrieve:
                results = state.getIn(["search", "retrieve"]).concat(action.recipe_documents);
                return state
                    .mergeIn(["search", "retrieve"], results);
            case actions.crud.recipeDocument.get:
                if (!action.document) return state;
                return state.mergeIn(["crud", "documents", action.document.documentId], action.document);
            case actions.crud.recipeDocument.getWords:
                return state
                    .mergeIn(["crud", "documents", action.documentId], {})
                    .setIn(["crud", "documents", action.documentId, "words"], action.words);
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
        this.retrieveAll = this.retrieveAll.bind(this);
        this.retrieveNone = this.retrieveNone.bind(this);
    };

    search(searchTerm: string, page: number = 1): JQueryPromise<any> {
        return jQuery.getJSON(this.endpoint, {search: searchTerm, page: page}).then(data => {
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

    retrieveAll() {
        store.dispatch({type: this.actions.retrieveAll});
    }

    retrieveNone() {
        store.dispatch({type: this.actions.retrieveNone});
    }
}

const FoodNetworkRecipeSearch = new RecipeSearch(
    endpoints.search.bySite.foodNetwork,
    actions.search.bySite.foodNetwork,
    () => store.getState().search.get("search").get("bySite").get("foodNetwork")
);


const FoodComRecipeSearch = new RecipeSearch(
    endpoints.search.bySite.foodCom,
    actions.search.bySite.foodCom,
    () => store.getState().search.get("search").get("bySite").get("foodCom")
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

    getDocument(documentId: number) {
        jQuery.getJSON(endpoints.crud.recipeDocument.get(documentId)).then(data => {
            store.dispatch({type: actions.crud.recipeDocument.get, document: data.document})
        });
    }

    getWords(documentId: number) {
        jQuery.getJSON(endpoints.crud.recipeDocument.getWords(documentId)).then(data => {
            store.dispatch({type: actions.crud.recipeDocument.getWords, documentId: documentId, words: data.words});
        });
    }
}

export interface IRecipeDocument {
    recipe_document_id: number;
    title: string;
    html: string;
    url: string;
    words?: RecipeDocumentWord[];
}

export interface RecipeDocumentWord {
    recipe_document_word_id: number;
    word: string;
    document_position: number;
    element_position: number;
    element_tag: string;
    original_format?: string;
}

export const search = {
    bySite: {
        foodCom: FoodComRecipeSearch,
        foodNetwork: FoodNetworkRecipeSearch
    },
    retrieve: new SearchResultRetriever()
};