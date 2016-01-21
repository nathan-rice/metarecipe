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

define(["require", "exports", 'react', 'react-dom', 'react-redux', 'api', './components/recipe-tagger/document-display'],
    function (require, exports, React, ReactDOM, ReactRedux, api, documentDisplay) {
    var el = document.getElementById("main"),
        documentList = React.createElement(documentDisplay.DocumentList, null),
        app = React.createElement(ReactRedux.Provider, {store: api.store}, documentList);
    ReactDOM.render(app, el);
});
