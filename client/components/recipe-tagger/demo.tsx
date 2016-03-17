/// <reference path="../../definitions/react-redux/react-redux.d.ts" />

import React = require('react');
import ReactDOM = require('react-dom');
import ReactRedux = require('react-redux');
import api = require('api');
import DocumentDisplay = require('document-display')

@ReactRedux.connect(getDemoInterfaceProps)
export class DemoInterface extends React.Component<any, any> {
    render() {
        var documents = this.props.documents,
            document = this.props.document ? <DocumentDisplay.FormattedDocument/> : '';
        return (
            <div className="container">
                <div className="row">
                    <div className="col-sm-8">
                        {document}
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
        document: state.data.getIn(["recipeDocument", "selected"]),
        documents: state.data.getIn(["recipeDocument", "instances"])
    }
}