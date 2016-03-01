/// <reference path="api-component.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/jquery/jquery.d.ts" />

import Immutable = require('immutable');

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

class Search extends CollectionAction {

    initiator = function(action: Search, searchTerm: string, page: number = 1): JQueryPromise<any> {
        return jQuery.getJSON(action.endpoint.url, {search: searchTerm, page: page}).then(data => {
            this.getStore().dispatch({
                type: action.name,
                search: searchTerm,
                results: data.results,
                nextPage: data.next_page
            });
        });
    };

    reducer = function(state, action) {
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
    };
}

class ToggleRetrieval extends CollectionAction {
    initiator = function(action: ToggleRetrieval, recipe: RecipeSearchResult) {
        action.getStore().dispatch({type: action.name, recipe: recipe})
    };

    reducer = (state, action) => {
        return state.updateIn(["retrieve", action.recipe.url], val => !val);
    }
}

class RetrieveAll extends CollectionAction {
    reducer = (state, action) => {
        let urlTuples = state.get("results").map(result => [result.url, true]),
            retrieve = Immutable.Map(urlTuples);
        return state.set("retrieve", retrieve);
    }
}

class RetrieveNone extends CollectionAction {
    reducer = (state, action) => {
        return state.set("retrieve", Immutable.Map());
    }
}

const shouldRetrieve = new CollectionAction(function (action, recipe: RecipeSearchResult) {
    return action.getState().get("retrieve").get(recipe.url);
});

const getSearchTerm = new CollectionAction(function (action) {
    return action.getState().get("nextPage")
});

const getNextPage = new CollectionAction(function (action) {
    return action.getState().get("nextPage")
});

const loadNextSearchPage = new CollectionAction(function() {
    return this.search(this.getSearchTerm(), this.getNextPage());
});

const taggedForRetrieval = new CollectionAction(function (action) {
    return action.getState().get("results").filter(r => this.getState().get("retrieve").get(r.url));
});

const getResults = new CollectionAction(function (action) {
    return action.getState().get("results");
});

var RecipeSearch = new CollectionNamespace({
    name: "Recipe Search",
    defaultState: Immutable.fromJS({}),
    components: {
        foodNetwork: new CollectionNamespace({
            name: "Food Network Recipe Search",
            defaultState: Immutable.fromJS({results: [], search: "", retrieve: {}, next_page: 1})
        }),
        foodCom: new CollectionNamespace({
            name: "Food.com Recipe Search",
            defaultState: Immutable.fromJS({results: [], search: "", retrieve: {}, next_page: 1})
        })
    }
});