/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />

var endpoints = {
    search: {
        foodNetwork: "/search/food_network/",
        foodCom: "/search/food_com/"
    }
};

const reducer = function (state: Immutable.Map<string, any>, action) {
    switch (action.type) {
        case 'UPDATE_FOOD.COM_RESULTS':
            return state
                .mergeIn(["search", "food_com", "results"], action.results)
                .updateIn(["search", "food_com", "next_page"], () => action.nextPage);
        case 'update_FOOD_NETWORK_RESULTS':
            return state
                .mergeIn(["search", "food_network", "results"], action.results)
                .updateIn(["search", "food_network", "next_page"], () => action.nextPage);
    }
    return state;
};

const store = Redux.createStore(reducer);

class ExternalRecipeSearch {
    static foodCom(searchTerm: string, page: number = 1) {
        jQuery.getJSON(endpoints.search.foodCom, {search: searchTerm, page: page}).then((data) => {
            store.dispatch({type: 'UPDATE_FOOD.COM_RESULTS', results: data.results, nextPage: data.next_page});
        });
    }

    static foodNetwork(searchTerm: string, page: number = 1) {
        jQuery.getJSON(endpoints.search.foodNetwork, {search: searchTerm, page: page}).then((data) => {
            store.dispatch({type: 'UPDATE_FOOD_NETWORK_RESULTS', results: data.results, nextPage: data.next_page});
        });
    }
}

