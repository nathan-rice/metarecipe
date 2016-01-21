/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />

import Immutable = require('immutable');
import jQuery = require('jquery');

class ObjectReducer {
    static list: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
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

    private setBindings() {
        this.reduce = this.reduce.bind(this);
    }

    constructor(private getState: Function, public store: Redux.Store) {
        this.setBindings();
    }

    reduce(state: Immutable.Map<string, any>, action): Immutable.Map<any, any> {
        var constructor = (this.constructor as typeof ObjectService),
            actions = constructor.actions;
        if (!state) {
            state = constructor.defaultState;
        }
        switch (action.type) {
            case actions.list:
                return constructor.reducers.list(state, action);
            case actions.create:
                return constructor.reducers.create(state, action);
            case actions.read:
                return constructor.reducers.read(state, action);
            case actions.update:
                return constructor.reducers.update(state, action);
            case actions.delete:
                return constructor.reducers.read(state, action);
            default:
                return state;
        }
    }
}

class RecipeDocumentReducer extends ObjectReducer {

    static list(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
        return state.mergeIn(["documents"], action.documents)
    }

    static read(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
        if (!action.document) return state;
        return state.mergeIn(["documents", action.document.documentId], action.document);
    }

    static words(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
        return state
            .mergeIn(["documents", action.documentId], {})
            .setIn([action.documentId, "words"], action.words);
    }
}

export class RecipeDocumentService extends ObjectService {

    static crudRoot = ObjectService.crudRoot + "recipe_document/";

    static actions = ObjectService.actions.merge({
        list: 'LIST_RECIPE_DOCUMENTS',
        read: 'READ_RECIPE_DOCUMENT',
        words: 'GET_RECIPE_DOCUMENT_WORDS'
    });

    static endpoints = ObjectService.endpoints.merge({
        list: RecipeDocumentService.crudRoot,
        read: (documentId: number) => RecipeDocumentService.crudRoot + documentId + "/",
        words: (documentId: number) => RecipeDocumentService.crudRoot + documentId + "/words/"
    });

    static reducers = RecipeDocumentReducer;

    static defaultState = Immutable.fromJS({
        documents: {},
        selectedDocument: 0
    });

    reduce(state: Immutable.Map<string, any>, action): Immutable.Map<any, any> {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            actions = constructor.actions,
            reducers = constructor.reducers;
        switch (action.type) {
            case actions.words:
                return reducers.words(state, action);
            default:
                return super.reduce(state, action);
        }
    }

    list() {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            endpoints = constructor.endpoints,
            actions = constructor.actions;
        return jQuery.getJSON(endpoints.list).then(data => {
            this.store.dispatch({type: actions.list, documents: data.documents})
        });
    }

    read(documentId: number) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            endpoints = constructor.endpoints,
            actions = constructor.actions;
        return jQuery.getJSON(endpoints.read(documentId)).then(data => {
            this.store.dispatch({type: actions.read, document: data.document})
        });
    }

    words(documentId: number) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            endpoints = constructor.endpoints,
            actions = constructor.actions;
        return jQuery.getJSON(endpoints.words(documentId)).then(data => {
            this.store.dispatch({type: actions.words, documentId: documentId, words: data.words});
        });
    }
}

interface IRecipeDocument {
    recipe_document_id: number;
    title: string;
    html: string;
    url: string;
    words?: RecipeDocumentWord[];
}

interface RecipeDocumentWord {
    recipe_document_word_id: number;
    word: string;
    document_position: number;
    element_position: number;
    element_tag: string;
    original_format?: string;
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
            .set("recipeDocument", this.recipeDocument.reduce(state, action));
    }

    private setBindings() {
        this.reduce = this.reduce.bind(this);
    }

    constructor(private getState: Function, public store: Redux.Store) {
        this.setBindings();
        this.recipeDocument = new RecipeDocumentService(() => getState().get("recipeDocument"), store);
    }
}