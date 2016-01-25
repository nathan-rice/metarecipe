import React = require('react');
import ReactDOM = require('react-dom');
import api = require('api');
import DocumentDisplay = require('document-display')


var app, el = document.getElementById("main");

class DemoInterface extends React.Component<any, any> {
    render() {
        var selectedDocument = api.crud.recipeDocument.getSelectedDocument(),
            documents = api.crud.recipeDocument.getDocuments();
        return (
            <div className="container">
                <div className="row">
                    <div className="col-sm-6" dangerouslySetInnerHTML={{__html: selectedDocument.html}}>
                    </div>
                    <div className="col-sm-6">
                        <DocumentDisplay.FormattedDocument selectedDocument={selectedDocument}/>
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

var documents, firstDocument;

api.crud.recipeDocument.list().then(_ => {
    documents = api.crud.recipeDocument.getDocuments();
    firstDocument = documents.first();
    api.crud.recipeDocument.setSelectedDocument(firstDocument.recipe_document_id);
    api.crud.recipeDocument.words(firstDocument.recipe_document_id).then(_ => {
        ReactDOM.render(<DemoInterface/>, el);
    });
});