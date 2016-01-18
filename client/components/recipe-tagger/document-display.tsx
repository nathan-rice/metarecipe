/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />

import api = require('api');
import react = require('react');


interface IDocumentTagDisplayProperties {
    document: api.IRecipeDocument;
}

class DocumentTagDisplay extends React.Component<IDocumentTagDisplayProperties, any> {
    render() {
        let allWords = this.props.document.words.map(word => <DocumentWord word={word}/>);
        return (
            <div>{allWords}</div>
        )
    }
}

interface IDocumentWordProperties {
    word: api.RecipeDocumentWord
}

class DocumentWord extends React.Component<any, any> {
    render() {
        return (
            <span>{word.original_format}</span>
        )
    }
}