require.config({
    baseUrl: "/client/",
    paths: {
        "jquery": "/client/libraries/jquery",
        "redux": "/client/libraries/redux",
        "immutable": "/client/libraries/immutable",
        "react-redux": "/client/libraries/react-redux",
        "redux-form": "/client/libraries/redux-form",
        "react": "/client/libraries/react",
        "react-dom": "/client/libraries/react-dom"
    }
});

define(["require", "exports", 'react-dom', 'react-redux', 'api', './components/recipe-importer/search'],
    function (require, exports, ReactDOM, ReactRedux, api, search) {
    var el = document.getElementById("main"),
        app = React.createElement(ReactRedux.Provider, {store: api.store}, React.createElement(search.SearchManager, null));
    ReactDOM.render(app, el);
});
