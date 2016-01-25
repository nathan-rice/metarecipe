require.config({
    baseUrl: "/client/",
    paths: {
        "jquery": "/client/libraries/jquery",
        "redux": "/client/libraries/redux",
        "immutable": "/client/libraries/immutable",
        "react-redux": "/client/libraries/react-redux",
        "redux-form": "/client/libraries/redux-form",
        "react": "/client/libraries/react",
        "react-dom": "/client/libraries/react-dom",
        "document-display": '/client/components/recipe-tagger/document-display'
    }
});

define(["require", "exports", 'jquery', 'react', 'react-dom', 'react-redux', 'api', '/client/components/recipe-tagger/demo.js'],
    function (require, exports, jQuery, React, ReactDOM, ReactRedux, api, demo) {}
);
