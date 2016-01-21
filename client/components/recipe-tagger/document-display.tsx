/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />
/// <reference path="../../definitions/react-redux/react-redux.d.ts" />

import api = require('api');
import React = require('react');
import ReactRedux = require('react-redux');


interface IDocumentTagDisplayProperties {
    document: any;
}

class DocumentList extends React.Component<any, any> {
    render() {
        let documents = this.props.documents.values().map(document => <li>document.title</li>);
        return (
            <ul>
                {documents}
            </ul>
        )
    }
}

class BaseDocumentDisplay extends React.Component<any, any> {

}

class DocumentTagDisplay extends React.Component<IDocumentTagDisplayProperties, any> {
    render() {
        let allWords = this.props.document.words.map(word => <DocumentWord word={word}/>);
        return (
            <div>{allWords}</div>
        )
    }
}

function makeDocumentDisplayProps(state) {
    var selectedDocument = state.crud.getIn(["recipeDocument", "selectedDocument"]);
    return {document: state.crud.getIn(["recipeDocument", "documents", selectedDocument.recipe_document_id])};
}

export const DocumentDisplay = ReactRedux.connect(makeDocumentDisplayProps)(BaseDocumentDisplay);

interface IDocumentWordProperties {
    word: api
}

class DocumentWord extends React.Component<any, any> {
    render() {
        return (
            <span>{word.original_format}</span>
        )
    }
}