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

export class RecipeSearchManager {

    static endpoints = {
        site: {
            foodNetwork: FoodNetworkRecipeSearch.endpoints,
            foodCom: FoodComRecipeSearch.endpoints
        },
        retrieve: "/search/retrieve/"
    };

    static actions = {
        site: {
            foodNetwork: FoodNetworkRecipeSearch.actions,
            foodCom: FoodComRecipeSearch.actions
        },
        retrieve: 'RETRIEVE_SEARCH_RESULTS_DOCUMENTS'
    };

    static defaultState = Immutable.fromJS({
        site: {
            foodNetwork: FoodNetworkRecipeSearch.defaultState,
            foodCom: FoodComRecipeSearch.defaultState
        },
        retrieve: []
    });

    public sites;

    constructor(private getState: Function, public store: Redux.Store) {
        this.retrieveSelected = this.retrieveSelected.bind(this);
        this.sites = {
            foodNetwork: new FoodNetworkRecipeSearch(() => getState().getIn(["site", "foodNetwork"]), this.store),
            foodCom: new FoodComRecipeSearch(() => getState().getIn(["site", "foodCom"]), this.store)
        }
    }

    reduce(state, action) {
        var constructor = (this.constructor as typeof RecipeSearchManager),
            actions = constructor.actions,
            results;
        if (!state) {
            state = constructor.defaultState;
        }
        if (action.type == actions.retrieve) {
            results = state.getIn(["search", "retrieve"]).concat(action.recipeDocuments);
            state = state.merge("retrieve", results);
        }
        return state
            .setIn(["site", "foodNetwork"], this.sites.foodNetwork.reduce(state.getIn(["site", "foodNetwork"]), action))
            .setIn(["site", "foodCom"], this.sites.foodNetwork.reduce(state.getIn(["site", "foodCom"]), action));
    }

    retrieveSelected() {
        var foodNetworkTagged = this.sites.foodNetwork.taggedForRetrieval(),
            foodComTagged = this.sites.foodCom.taggedForRetrieval();
        return this.retrieve(foodNetworkTagged.concat(foodComTagged));
    }

    retrieve(results: Immutable.List<RecipeSearchResult>) {
        let constructor = (this.constructor as typeof RecipeSearchManager),
            actions = constructor.actions,
            endpoints = constructor.endpoints;
        jQuery.ajax({
            type: "POST",
            url: endpoints.retrieve,
            data: JSON.stringify(results.toJS()),
            contentType: "application/json; charset=utf-8"
        }).then(data => store.dispatch({type: actions.retrieve, recipeDocuments: data.recipe_documents}));
    }
}

interface IRecipeSearchEndpoints {
    update: string;
}

interface IRecipeSearchActions {
    update: string;
    toggleRetrieval: string;
    retrieveAll: string;
    retrieveNone: string
}

class RecipeSearchReducer {
    static update(state, action) {
        let results = Immutable.List(action.results.map(RecipeSearchResult.fromArray));
        if (action.nextPage > 1) {
            let oldResults = state.get("results"),
                oldResultsIds = Immutable.Set(oldResults.map(result => result.url)),
                newResultsOnly = results.filter((result: RecipeSearchResult) => !oldResultsIds.contains(result.url));
            results = oldResults.concat(newResultsOnly);
        }
        return state
            .merge("results", results)
            .set("nextPage", action.nextPage);
    }

    static toggleRetrieve(state, action) {
        return state.update("retrieve", action.recipe.url, val => !val);
    }

    static retrieveAll(state, action) {
        let urlTuples = state.get("results").map(result => [result.url, true]),
            retrieve = Immutable.Map(urlTuples);
        return state.set("retrieve", retrieve);
    };

    static retrieveNone(state, action) {
        return state.set("retrieve", Immutable.Map());
    };
}

export class RecipeSearch {

    static endpoints: IRecipeSearchEndpoints;
    static actions: IRecipeSearchActions;
    static reducers = RecipeSearchReducer;
    static defaultState = Immutable.fromJS({results: [], retrieve: {}, next_page: 1});

    constructor(private getState: Function, public store: Redux.Store) {
        this.loadNextSearchPage = this.loadNextSearchPage.bind(this);
        this.retrieveAll = this.retrieveAll.bind(this);
        this.retrieveNone = this.retrieveNone.bind(this);
    };

    reduce(state, action) {
        var constructor = (this.constructor as typeof RecipeSearch),
            actions = constructor.actions,
            reducers = constructor.reducers;
        if (!state) {
            state = constructor.defaultState;
        }
        switch (action.type) {
            case actions.retrieveAll:
                return reducers.retrieveAll(state, action);
            case actions.retrieveNone:
                return reducers.retrieveNone(state, action);
            case actions.toggleRetrieval:
                return reducers.toggleRetrieve(state, action);
            case actions.update:
                return reducers.update(state, action);
            default:
                return state;
        }
    }

    search(searchTerm: string, page: number = 1): JQueryPromise<any> {
        let constructor = (this.constructor as typeof RecipeSearch);
        return jQuery.getJSON(constructor.endpoints.update, {search: searchTerm, page: page}).then(data => {
            this.store.dispatch({
                type: constructor.actions.update,
                search: searchTerm,
                results: data.results,
                nextPage: data.next_page
            });
        });
    }

    loadNextSearchPage() {
        return this.search(this.getSearchTerm(), this.getNextPage());
    }

    getSearchTerm(): string {
        return this.getState().get("search");
    }

    getNextPage(): number {
        return this.getState().get("next_page");
    }

    getResults(): RecipeSearchResult[] {
        return this.getState().get("results");
    }

    toggleRetrieval(recipe: RecipeSearchResult) {
        this.store.dispatch({type: (this.constructor as typeof RecipeSearch).actions.toggleRetrieval, recipe: recipe})
    }

    shouldRetrieve(recipe: RecipeSearchResult): boolean {
        return this.getState().get("retrieve").get(recipe.url);
    }

    taggedForRetrieval(): Immutable.List<RecipeSearchResult> {
        return this.getState().get("results").filter(r => this.getState().get("retrieve").get(r.url));
    }

    retrieveAll() {
        this.store.dispatch({type: (this.constructor as typeof RecipeSearch).actions.retrieveAll});
    }

    retrieveNone() {
        this.store.dispatch({type: (this.constructor as typeof RecipeSearch).actions.retrieveNone});
    }
}

class FoodNetworkRecipeSearch extends RecipeSearch {
    static actions = {
        update: 'FOOD.COM_UPDATE_RESULTS',
        toggleRetrieval: 'FOOD.COM_MARK_FOR_RETRIEVAL',
        retrieveAll: 'FOOD.COM_MARK_ALL_FOR_RETRIEVAL',
        retrieveNone: 'FOOD.COM_MARK_NONE_FOR_RETRIEVAL'
    };

    static endpoints = {update: "/search/by_site/food_network/"}
}

class FoodComRecipeSearch extends RecipeSearch {
    static actions = {
        update: 'FOOD_NETWORK_UPDATE_RESULTS',
        toggleRetrieval: 'FOOD_NETWORK_MARK_FOR_RETRIEVAL',
        retrieveAll: 'FOOD_NETWORK_MARK_ALL_FOR_RETRIEVAL',
        retrieveNone: 'FOOD_NETWORK_MARK_NONE_FOR_RETRIEVAL'
    };

    static endpoints = {update: "/search/by_site/food_com/"}
}

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