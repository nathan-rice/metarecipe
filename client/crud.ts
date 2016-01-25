/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />

import Immutable = require('immutable');
import jQuery = require('jquery');

class ObjectReducer {
    static list: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => {
        return state;
    }
    static create: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
    static read: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
    static update: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
    static delete: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
}

class ObjectService {

    static crudRoot = '/crud/';

    static actions = Immutable.fromJS({
        list: 'GENERIC_LIST',
        create: 'GENERIC_CREATE',
        read: 'GENERIC_READ',
        update: 'GENERIC_UPDATE',
        delete: 'GENERIC_DELETE'
    });

    static endpoints = Immutable.fromJS({
        list: ObjectService.crudRoot,
        create: ObjectService.crudRoot,
        read: ObjectService.crudRoot,
        update: ObjectService.crudRoot,
        delete: ObjectService.crudRoot
    });

    static reducers = ObjectReducer;

    static defaultState = Immutable.fromJS({});

    protected setBindings() {
        this.reduce = this.reduce.bind(this);
    }

    constructor(protected getState: Function, public store: Redux.Store) {
        this.setBindings();
    }

    reduce(state: Immutable.Map<string, any>, action): Immutable.Map<any, any> {
        var constructor = (this.constructor as typeof ObjectService),
            actions = constructor.actions;
        if (!state) {
            state = constructor.defaultState;
        }
        switch (action.type) {
            case actions.get("list"):
                return constructor.reducers.list(state, action);
            case actions.get("create"):
                return constructor.reducers.create(state, action);
            case actions.get("read"):
                return constructor.reducers.read(state, action);
            case actions.get("update"):
                return constructor.reducers.update(state, action);
            case actions.get("delete"):
                return constructor.reducers.read(state, action);
            default:
                return state;
        }
    }
}

class RecipeDocumentReducer extends ObjectReducer {

    static setSelectedDocument(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
        return state.set("selectedDocument", action.documentId);
    }

    static list(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
        return state.mergeIn(["documents"],
            action.documents
                .map(RecipeDocument.fromObject)
                .map(o => [o.recipe_document_id, o])
        )
    }

    static read(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
        if (!action.document) return state;
        return state.mergeIn(["documents", action.document.documentId], RecipeDocument.fromObject(action.document));
    }

    static words(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
        return state
            .mergeIn(["documents", action.documentId], {})
            .setIn(["documents", action.documentId, "words"], Immutable.List(action.words).map(RecipeDocumentWord.fromObject));
    }
}

const RecipeDocumentWordRecord = Immutable.Record({
    recipe_document_word_id: 0,
    word: '',
    document_position: 0,
    element_position: 0,
    element_tag: 'p',
    original_format: ''
});

export class RecipeDocumentWord extends RecipeDocumentWordRecord {
    recipe_document_word_id: number;
    word: string;
    document_position: number;
    element_position: number;
    element_tag: string;
    original_format: string;

    static fromObject(o) {
        return new RecipeDocumentWord({
            recipe_document_word_id: o.recipe_document_word_id,
            word: o.word,
            document_position: o.document_position,
            element_position: o.element_position,
            element_tag: o.element_tag,
            original_format: o.original_format
        });
    }
}

const RecipeDocumentRecord = Immutable.Record({recipe_document_id: 0, title: '', html: '', url: '', words: Immutable.List()});

export class RecipeDocument extends RecipeDocumentRecord {
    recipe_document_id: number;
    title: string;
    html: string;
    url: string;
    words: Immutable.List<RecipeDocumentWord>;

    static fromObject(o) {
        return new RecipeDocument({recipe_document_id: o.recipe_document_id, title: o.title, html: o.html, url: o.url});
    }
}

export class RecipeDocumentService extends ObjectService {

    static crudRoot = ObjectService.crudRoot + "recipe_document/";

    static actions:Immutable.Map<string, any> = ObjectService.actions.merge({
        list: 'LIST_RECIPE_DOCUMENTS',
        read: 'READ_RECIPE_DOCUMENT',
        words: 'GET_RECIPE_DOCUMENT_WORDS',
        setSelectedDocument: 'SET_SELECTED_RECIPE_DOCUMENT'
    });

    static endpoints: Immutable.Map<string, string & Function> = ObjectService.endpoints.merge({
        list: RecipeDocumentService.crudRoot,
        read: (documentId: number) => RecipeDocumentService.crudRoot + documentId + "/",
        words: (documentId: number) => RecipeDocumentService.crudRoot + documentId + "/words/"
    });

    static reducers = RecipeDocumentReducer;

    static defaultState:Immutable.Map<string, any> = Immutable.fromJS({
        documents: {},
        selectedDocument: 0
    });

    getDocument(documentId: number): RecipeDocument {
        return this.getState().getIn(["documents", documentId]);
    }

    getDocuments(): Immutable.List<RecipeDocument> {
        var documentIterator = this.getState().get("documents").values();
        return Immutable.List(documentIterator) as Immutable.List<RecipeDocument>;
    }

    getSelectedDocumentID(): number {
        return this.getState().get("selectedDocument")
    }

    getSelectedDocument(): RecipeDocument {
        var state = this.getState(), documentId = state.get("selectedDocument");
        return state.getIn(["documents", documentId]);
    }

    setSelectedDocument(documentId: number) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            actions = constructor.actions;
        this.store.dispatch({type: actions.get("setSelectedDocument"), documentId: documentId});
    }

    reduce(state: Immutable.Map<string, any>, action): Immutable.Map<any, any> {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            actions = constructor.actions,
            reducers = constructor.reducers;
        switch (action.type) {
            case actions.get("words"):
                return reducers.words(state, action);
            case actions.get("setSelectedDocument"):
                return reducers.setSelectedDocument(state, action);
            default:
                return super.reduce(state, action);
        }
    }

    list() {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            endpoints = constructor.endpoints,
            actions = constructor.actions;
        return jQuery.getJSON(endpoints.get("list")).then(data => {
            this.store.dispatch({type: actions.get("list"), documents: data.documents})
        });
    }

    read(documentId: number) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            endpoints = constructor.endpoints,
            actions = constructor.actions;
        return jQuery.getJSON(endpoints.get("read")(documentId)).then(data => {
            this.store.dispatch({type: actions.get("read"), document: data.document})
        });
    }

    words(documentId: number) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            endpoints = constructor.endpoints,
            actions = constructor.actions;
        return jQuery.getJSON(endpoints.get("words")(documentId)).then(data => {
            this.store.dispatch({type: actions.get("words"), documentId: documentId, words: data.words});
        });
    }
}


export class ObjectManager {

    recipeDocument: RecipeDocumentService;

    static actions = {
        recipeDocument: RecipeDocumentService.actions
    };

    static endpoints = {
        recipeDocument: RecipeDocumentService.endpoints
    };

    static reducers = {
        recipeDocument: RecipeDocumentService.reducers
    };

    static defaultState = Immutable.fromJS({
        recipeDocument: RecipeDocumentService.defaultState
    });

    reduce(state: Immutable.Map<string, any>, action): Immutable.Map<any, any> {
        var constructor = (this.constructor as typeof ObjectManager);
        if (!state) {
            state = constructor.defaultState;
        }
        return state
            .set("recipeDocument", this.recipeDocument.reduce(state.get("recipeDocument"), action));
    }

    protected setBindings() {
        this.reduce = this.reduce.bind(this);
    }

    constructor(protected getState: Function, public store: Redux.Store) {
        this.setBindings();
        this.recipeDocument = new RecipeDocumentService(() => getState().get("recipeDocument"), store);
    }
}