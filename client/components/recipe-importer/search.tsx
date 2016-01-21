/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />
/// <reference path="../../definitions/react-redux/react-redux.d.ts" />
/// <reference path="../../definitions/redux-form/redux-form.d.ts" />

import api = require('api');
import React = require('react');
import ReduxForm = require('redux-form');
import ReactRedux = require('react-redux');


class BaseSearchManager extends React.Component<any, any> {

    render() {
        return (
            <div>
                <h2>Recipe search</h2>
                <SearchTermInput />
                <SearchResults title="Food Network results" search={api.search.site.foodNetwork}
                               results={api.search.site.foodNetwork.getResults()}/>
                <SearchResults title="Food.com results" search={api.search.site.foodCom}
                               results={api.search.site.foodCom.getResults()}/>
                <button onClick={api.search.retrieveSelected} className="btn btn-primary">
                    Retrieve selected results
                </button>
            </div>
        )
    }
}

export const SearchManager = ReactRedux.connect((state) => ({search: state.search}))(BaseSearchManager);

class BaseSearchTermInput extends React.Component<any, any> {

    submit(values) {
        if (values.searchTerm) {
            api.search.site.foodNetwork.search(values.searchTerm);
            api.search.site.foodCom.search(values.searchTerm);
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

export const SearchTermInput = ReduxForm.reduxForm({
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
                <div className="pull-left">
                    <button className="btn btn-default btn-sm" onClick={this.props.search.loadNextSearchPage}>Get more results</button>
                    </div>
                <div className="pull-right">
                    <button className="btn btn-default btn-sm" onClick={this.props.search.retrieveAll}>Select all</button>
                                <button className="btn btn-default btn-sm" onClick={this.props.search.retrieveNone}>Deselect all</button>
                    </div>
                <div className="clearfix"></div>
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