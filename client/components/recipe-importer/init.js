require.config({
    baseUrl: "/client/",
    paths: {
        "redux": "/client/libraries/redux",
        "immutable": "/client/libraries/immutable",
        "react-redux": "/client/libraries/react-redux",
        "redux-form": "/client/libraries/redux-form",
        "react": "https://cdnjs.cloudflare.com/ajax/libs/react/0.14.3/react",
        "react-dom": "https://cdnjs.cloudflare.com/ajax/libs/react/0.14.3/react-dom"
    }
});

define(["require", "exports", 'react-dom', 'react-redux', 'api', './components/recipe-importer/search'],
    function (require, exports, ReactDOM, reactRedux, api, search) {
    var el = document.getElementById("main"),
        app = React.createElement(reactRedux.Provider, {store: api.store}, React.createElement(search.SearchManager, null));
    ReactDOM.render(app, el);
});
