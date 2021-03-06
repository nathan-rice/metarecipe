require.config({
    baseUrl: "/client/",
    urlArgs: "bust=" + (new Date()).getTime(),
    paths: {
        "jquery": "/client/libraries/jquery",
        "redux": "/client/libraries/redux",
        "immutable": "/client/libraries/immutable",
        "react-redux": "/client/libraries/react-redux",
        "redux-form": "/client/libraries/redux-form",
        "react": "/client/libraries/react",
        "react-dom": "/client/libraries/react-dom",
        "recipe-creator": '/client/components/recipe-creator/recipe-creator'
    }
});

define(["require", "exports", 'jquery', 'react', 'react-dom', 'react-redux', 'api', '/client/components/recipe-creator/demo.js'],
    function (require, exports, jQuery, React, ReactDOM, ReactRedux, api, demo) {
        api.crud.recipeDocument.list();
        var el = document.getElementById("main"),
            demoInterface = React.createElement(demo.DemoInterface, null),
            app = React.createElement(ReactRedux.Provider, {store: api.store}, demoInterface);
        ReactDOM.render(app, el);
    }
);
