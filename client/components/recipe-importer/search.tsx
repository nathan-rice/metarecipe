/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />
/// <reference path="../../definitions/redux-form/redux-form.d.ts" />

import api = require('api');
import reduxForm = require('redux-form');

class BaseSearchManager extends React.Component<any, any> {

    submit(values) {
        if (values.searchTerm) {
            api.search.foodNetwork.search(values.searchTerm);
            api.search.foodCom.search(values.searchTerm);
        }
    }

    render() {
        const {fields: {searchTerm}, handleSubmit} = this.props;
        return (
            <div>
                <h2>Recipe search</h2>
                <form onSubmit={handleSubmit(this.submit)}>
                    <div className="form-group">
                        <label htmlFor="search_term">Search terms</label>
                        <input className="form-control" id="search_term" type="text" {...searchTerm}/>
                    </div>
                    <button type="submit">Search!</button>
                </form>
                <SearchResults title="Food Network results" results={api.search.foodNetwork.getResults()}></SearchResults>
                <SearchResults title="Food.com results" results={api.search.foodCom.getResults()}></SearchResults>
            </div>
        )
    }
}


export const SearchManager = reduxForm.reduxForm({
    form: 'search',
    fields: ['searchTerm']
})(BaseSearchManager);


export class SearchResults extends React.Component<any, any> {
    render() {
        if (this.props.results.size == 0) return <div/>;
        return (
            <div>
                <h3>{ this.props.title }</h3>
                <table>
                    <thead>
                        <tr>
                            <td>Title</td>
                            <td>Author</td>
                            <td>Retrieve?</td>
                        </tr>
                    </thead>
                    <tbody>
                        {this.props.results.map(result => {
                            <tr>
                                <td>{ result.title }</td>
                                <td>{ result.author }</td>
                                <td>
                                    <input type="checkbox"/>
                                </td>
                            </tr>
                            })}
                    </tbody>
                </table>
            </div>
        )
    }
}