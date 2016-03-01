/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />

import Immutable = require('immutable');
import jQuery = require('jquery');

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
        var results = Immutable.List(action.results.map(RecipeSearchResult.fromArray));
        // If we are getting additional results, we need to keep previous results around
        if (action.nextPage > 2) {
            let oldResults = state.get("results"),
                oldResultsIds = Immutable.Set(oldResults.map(result => result.url)),
                newResultsOnly = results.filter((result: RecipeSearchResult) => !oldResultsIds.contains(result.url));
            results = oldResults.concat(newResultsOnly);
        }
        return state
            .set("results", results)
            .set("search", action.search)
            .set("nextPage", action.nextPage);
    }

    static toggleRetrieve(state, action) {

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
    static defaultState = Immutable.fromJS({results: [], search: "", retrieve: {}, next_page: 1});

    constructor(private getState: Function, public store: Redux.Store) {
        this.reduce = this.reduce.bind(this);
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
        return this.getState().get("nextPage");
    }

    getResults(): RecipeSearchResult[] {
        return this.getState().get("results");
    }

    toggleRetrieval(recipe: RecipeSearchResult) {
        var constructor = (this.constructor as typeof RecipeSearch),
            actions = constructor.actions;
        this.store.dispatch({type: actions.toggleRetrieval, recipe: recipe})
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

    static endpoints = {update: "/search/site/food_network/"}
}

class FoodComRecipeSearch extends RecipeSearch {
    static actions = {
        update: 'FOOD_NETWORK_UPDATE_RESULTS',
        toggleRetrieval: 'FOOD_NETWORK_MARK_FOR_RETRIEVAL',
        retrieveAll: 'FOOD_NETWORK_MARK_ALL_FOR_RETRIEVAL',
        retrieveNone: 'FOOD_NETWORK_MARK_NONE_FOR_RETRIEVAL'
    };

    static endpoints = {update: "/search/site/food_com/"}
}

const SearchResultRecord = Immutable.Record({title:'', author: '', url: '', id: 0});

export class RecipeSearchResult extends SearchResultRecord {

    title: string;
    author: string;
    url: string;
    id: number;

    static fromImmutableMap(immutableMap): RecipeSearchResult {
        let title = immutableMap.get(0),
            author = immutableMap.get(1),
            url = immutableMap.get(2),
            id = immutableMap.get(3);
        return new RecipeSearchResult({title: title, author: author, url: url, id: id})
    }

    static fromArray(array): RecipeSearchResult {
        let title = array[0],
            author = array[1],
            url = array[2],
            id = array[3];
        return new RecipeSearchResult({title: title, author: author, url: url, id: id});
    }

}

export class RecipeSearchManager {

    RecipeSearch;
    RecipeSearchResult;

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

    public site;

    constructor(private getState: Function, public store: Redux.Store) {
        this.retrieveSelected = this.retrieveSelected.bind(this);
        this.reduce = this.reduce.bind(this);
        this.site = {
            foodNetwork: new FoodNetworkRecipeSearch(() => getState().getIn(["site", "foodNetwork"]), this.store),
            foodCom: new FoodComRecipeSearch(() => getState().getIn(["site", "foodCom"]), this.store)
        };
        this.RecipeSearch = RecipeSearch;
        this.RecipeSearchResult = RecipeSearchResult;
    }

    reduce(state: Immutable.Map<string, any>, action) {
        var constructor = (this.constructor as typeof RecipeSearchManager),
            actions = constructor.actions,
            results;
        if (!state) {
            state = constructor.defaultState;
        }
        if (action.type == actions.retrieve) {
            results = state.get("retrieve").concat(action.recipeDocuments);
            state = state.set("retrieve", results);
        }
        return state
            .setIn(["site", "foodNetwork"], this.site.foodNetwork.reduce(state.getIn(["site", "foodNetwork"]), action))
            .setIn(["site", "foodCom"], this.site.foodCom.reduce(state.getIn(["site", "foodCom"]), action));
    }

    retrieveSelected() {
        var foodNetworkTagged = this.site.foodNetwork.taggedForRetrieval(),
            foodComTagged = this.site.foodCom.taggedForRetrieval();
        return this.retrieve(foodNetworkTagged.concat(foodComTagged));
    }

    retrieve(results: Immutable.List<RecipeSearchResult>) {
        let constructor = (this.constructor as typeof RecipeSearchManager),
            actions = constructor.actions,
            endpoints = constructor.endpoints;
        return jQuery.ajax({
            type: "POST",
            url: endpoints.retrieve,
            data: JSON.stringify(results.toJS()),
            contentType: "application/json; charset=utf-8"
        }).then(data => this.store.dispatch({type: actions.retrieve, recipeDocuments: data.recipe_documents}));
    }
}