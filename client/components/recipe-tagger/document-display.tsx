/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />

import api = require('api');
import react = require('react');


interface IDocumentTagDisplayProperties {

}

class DocumentTagDisplay extends React.Component<any, any> {
    render() {
        return (
            <div></div>
        )
    }
}

interface IDocumentWordProperties {
    word: api.RecipeDocumentWord
}

class DocumentWord extends React.Component<any, any> {
    render() {
        return (
            <span>{}</span>
        )
    }
}