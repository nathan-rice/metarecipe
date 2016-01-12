/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />
///  <reference path="../../definitions/react-redux/react-redux.d.ts" />
/// <reference path="../../definitions/redux-form/redux-form.d.ts" />
/// <reference path="../../definitions/immutable/immutable.d.ts" />

import api = require('api');
import React = require('react');
import reduxForm = require('redux-form');
import ReactRedux = require('react-redux');

class ISearchManagerProperties {
    search: api.RecipeSearch;
    results: api.RecipeSearchResult[]
}

class BaseSearchManager extends React.Component<ISearchManagerProperties, any> {

    render() {
        return (
            <div>
                <h2>Recipe search</h2>
                <SearchTermInput />
                <SearchResults title="Food Network results" search={api.search.bySite.foodNetwork}
                               results={api.search.bySite.foodNetwork.getResults()}/>
                <SearchResults title="Food.com results" search={api.search.bySite.foodCom}
                               results={api.search.bySite.foodCom.getResults()}/>
            </div>
        )
    }
}

export const SearchManager = ReactRedux.connect((state) => ({search: state.search.get("search")}))(BaseSearchManager);


class BaseSearchTermInput extends React.Component<any, any> {

    submit(values) {
        if (values.searchTerm) {
            api.search.bySite.foodNetwork.search(values.searchTerm);
            api.search.bySite.foodCom.search(values.searchTerm);
        }
    }

    render() {
        const {fields: {searchTerm}, handleSubmit} = this.props;
        return (
            <form onSubmit={handleSubmit(this.submit)}>
                <div className="form-group">
                    <label htmlFor="search_term">Search terms</label>
                    <input className="form-control" id="search_term" type="text" {...searchTerm}/>
                </div>
                <button type="submit">Search!</button>
            </form>
        )
    }
}

export const SearchTermInput = reduxForm.reduxForm({
    form: 'search',
    fields: ['searchTerm']
})(BaseSearchTermInput);


export class SearchResults extends React.Component<any, any> {
    render() {
        if (this.props.results.size == 0) return <div/>;
        let mapF = result => <SearchResult search={this.props.search} key={result.id} result={result}/>,
            results = this.props.results.toJS().map(mapF);
        return (
            <div>
                <h3>{ this.props.title }</h3>
                <table className="table table-condensed table-striped">
                    <thead>
                        <tr>
                            <td>Title</td>
                            <td>Author</td>
                            <td>Retrieve?</td>
                        </tr>
                    </thead>
                    <tbody>
                        {results}
                    </tbody>
                </table>
                <button onClick={this.props.search.loadNextSearchPage}>Get more results</button>
            </div>
        )
    }
}

class SearchResult extends React.Component<any, any> {
    render() {
        return (
            <tr>
                <td>{ this.props.result.title }</td>
                <td>{ this.props.result.author }</td>
                <td>
                    <input type="checkbox" checked={this.props.search.shouldRetrieve(this.props.result)}
                           onChange={() => this.props.search.toggleRetrieval(this.props.result)}/>
                </td>
            </tr>
        )
    }
}