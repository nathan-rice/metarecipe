/// <reference path="api-component.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/jquery/jquery.d.ts" />

import Immutable = require('immutable');
import radical = require('api-component');

const
    CollectionAction = radical.CollectionAction,
    CollectionNamespace = radical.CollectionNamespace,
    Endpoint = radical.Endpoint;

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
            action.getStore().dispatch({
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

class RecipeSiteSearch extends CollectionNamespace {
    defaultState = Immutable.fromJS({results: [], search: "", retrieve: {}, next_page: 1});
    shouldRetrieve = CollectionAction.create(function (action, recipe: RecipeSearchResult) {
        return action.getState().get("retrieve").get(recipe.url);
    });
    getSearchTerm = CollectionAction.create(function (action) {
        return action.getState().get("nextPage")
    });
    getNextPage = CollectionAction.create(function (action) {
        return action.getState().get("nextPage")
    });
    loadNextSearchPage = CollectionAction.create(function () {
        return this.search(this.getSearchTerm(), this.getNextPage());
    });
    taggedForRetrieval = CollectionAction.create(function (action) {
        return action.getState().get("results").filter(r => action.getState().get("retrieve").get(r.url));
    });
    getResults = CollectionAction.create(function (action) {
        return action.getState().get("results");
    });
}

class FoodNetworkRecipeSearch extends RecipeSiteSearch {
    name = "Food Network Recipe Search";
    search = Search.create({name: "Food Network Recipe Search: search", endpoint: "/search/site/food_network/"});
    toggleRetrieval = ToggleRetrieval.create({name: "Food Network Recipe Search: toggle retrieval"});
    retrieveAll = RetrieveAll.create({name: "Food Network Recipe Search: retrieve all"});
    retrieveNone = RetrieveNone.create({name: "Food Network Recipe Search: retrieve none"});
}

class FoodComRecipeSearch extends RecipeSiteSearch {
    name = "Food.com Recipe Search";
    search = Search.create({name: "Food.com Recipe Search: search", endpoint: "/search/site/food_network/"});
    toggleRetrieval = ToggleRetrieval.create({name: "Food.com Recipe Search: toggle retrieval"});
    retrieveAll = RetrieveAll.create({name: "Food.com Recipe Search: retrieve all"});
    retrieveNone = RetrieveNone.create({name: "Food.com Recipe Search: retrieve none"});
}

export class RecipeSearchManager extends CollectionNamespace {
    name = "Recipe Search Manager";
    defaultState = Immutable.fromJS({retrieve: []});
    foodNetwork = FoodNetworkRecipeSearch.create() as FoodNetworkRecipeSearch;
    foodCom = FoodComRecipeSearch.create() as FoodComRecipeSearch;

    retrieve = CollectionAction.create({
        name: "Recipe Search Manager: retrieve all",
        endpoint: new Endpoint({
            method: "POST",
            url: "/search/retrieve/",
            body: {contentType: "application/json; charset=utf-8"}
        }),
        initiator: function(action, results: Immutable.List<RecipeSearchResult>) {
            return jQuery.ajax({
                type: action.endpoint.method,
                url: action.endpoint.url,
                data: JSON.stringify(results.toJS()),
                contentType: action.endpoint.body.contentType
            }).then(data => action.getStore().dispatch({type: action.name, recipeDocuments: data.recipe_documents}));
        }
    });

    retrieveSelected = CollectionAction.create(function () {
        var foodNetworkTagged = this.foodNetwork.taggedForRetrieval(),
            foodComTagged = this.foodCom.taggedForRetrieval();
        return this.retrieve(foodNetworkTagged.concat(foodComTagged));
    })
}