/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />
/// <reference path="../../definitions/react-bootstrap/react-bootstrap.d.ts" />
/// <reference path="../../api.ts" />

import * as bs from "react-bootstrap";

class SearchManager extends React.Component<any, any> {
    render() {
        return (
            <div>
                <h2>Working as intended</h2>
                <form>
                    <bs.Input type="text" label="Search term"/>
                    <bs.Button>Search!</bs.Button>
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