/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />
/// <reference path="../../definitions/react-bootstrap/react-bootstrap.d.ts" />
/// <reference path="../../api.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "react-bootstrap"], function (require, exports, bs) {
    var SearchManager = (function (_super) {
        __extends(SearchManager, _super);
        function SearchManager() {
            _super.apply(this, arguments);
        }
        SearchManager.prototype.render = function () {
            return (React.createElement("div", null, React.createElement("h2", null, "Working as intended"), React.createElement("form", null, React.createElement(bs.Input, {"type": "text", "label": "Search term"}), React.createElement(bs.Button, null, "Search!"))));
        };
        return SearchManager;
    })(React.Component);
    var SearchResults = (function (_super) {
        __extends(SearchResults, _super);
        function SearchResults() {
            _super.apply(this, arguments);
        }
        SearchResults.prototype.render = function () {
            return (React.createElement("div", null, React.createElement("h3", null, this.props.title), React.createElement("table", null, React.createElement("th", null, React.createElement("tr", null, React.createElement("td", null, "Title"), React.createElement("td", null, "Author"), React.createElement("td", null, "Retrieve?"))), React.createElement("tbody", null, this.props.results.map(function (result) {
                React.createElement("tr", null, React.createElement("td", null, result[0]), React.createElement("td", null, result[1]), React.createElement("td", null, React.createElement("input", {"type": "checkbox"})));
            })))));
        };
        return SearchResults;
    })(React.Component);
});
//# sourceMappingURL=search.js.map