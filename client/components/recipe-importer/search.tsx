/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />
/// <reference path="../../api.ts" />

class SearchManager extends React.Component<any, any> {
    render() {
        return (
            <div>
                <h2>Working as intended</h2>
                <form>
                    <div className="form-group">
                        <label htmlFor="search_term">Search term</label>
                        <div className="form-control"><input id="search_term" type="text"/></div>
                    </div>
                    <button type="submit">Search!</button>
                </form>
            </div>
        )
    }
}

class SearchResults extends React.Component<any, any> {
    render() {
        return (
            <div>
                <h3>{ this.props.title }</h3>
                <table>
                    <th>
                        <tr>
                            <td>Title</td>
                            <td>Author</td>
                            <td>Retrieve?</td>
                        </tr>
                    </th>
                    <tbody>
                        {this.props.results.map(result => {
                            <tr>
                                <td>{ result[0] }</td>
                                <td>{ result[1] }</td>
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