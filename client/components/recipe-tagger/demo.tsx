/// <reference path="../../definitions/react-redux/react-redux.d.ts" />

import React = require('react');
import ReactDOM = require('react-dom');
import ReactRedux = require('react-redux');
import api = require('api');
import DocumentDisplay = require('document-display')


class BaseDemoInterface extends React.Component<any, any> {
    render() {
        var documents = this.props.documents,
            document = documents ? documents.get(this.props.documentID) : null,
            html = document ? document.html : '';
        return (
            <div className="container">
                <div className="row">
                    <div className="col-sm-6" dangerouslySetInnerHTML={{__html: html}}>
                    </div>
                    <div className="col-sm-6">
                        <DocumentDisplay.FormattedDocument document={document}/>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-12">
                        <DocumentDisplay.DocumentList documents={documents}/>
                    </div>
                </div>
            </div>
        )
    }
}

function getDemoInterfaceProps(state) {
    return {
        documentID: state.crud.getIn(["recipeDocument", "selectedDocumentID"]),
        documents: state.crud.getIn(["recipeDocument", "documents"])
    }
}

export const DemoInterface = ReactRedux.connect(getDemoInterfaceProps)(BaseDemoInterface);