/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />

import Immutable = require('immutable');
import jQuery = require('jquery');

class ObjectManager {
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


    reduce(state: Immutable.Map<string, any>, action): Immutable.Map<any, any> {
        return state;
    }
}

class ObjectReducer {
    static create: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
    static read: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
    static update: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
    static delete: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
}

class ObjectService {

    static crudRoot = '/crud/';

    static actions = Immutable.fromJS({
        create: 'GENERIC_CREATE',
        read: 'GENERIC_READ',
        update: 'GENERIC_UPDATE',
        delete: 'GENERIC_DELETE'
    });

    static endpoints = Immutable.fromJS({
        create: ObjectService.crudRoot,
        read: ObjectService.crudRoot,
        update: ObjectService.crudRoot,
        delete: ObjectService.crudRoot
    });

    static reducers = ObjectReducer;

    static defaultState = Immutable.fromJS({});

    private setBindings() {}

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

    static read(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
        if (!action.document) return state;
        return state.merge(action.document.documentId, action.document);
    }

    static words(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
        return state
            .merge(action.documentId, {})
            .setIn([action.documentId, "words"], action.words);
    }
}

class RecipeDocumentService extends ObjectService {

    static crudRoot = ObjectService.crudRoot + "recipe_document/";

    static actions = ObjectService.actions.update({
        read: 'READ_RECIPE_DOCUMENT',
        words: 'GET_RECIPE_DOCUMENT_WORDS'
    });

    static endpoints = ObjectService.endpoints.update({
        read: (documentId: number) => RecipeDocumentService.crudRoot + documentId + "/",
        words: (documentId: number) => RecipeDocumentService.crudRoot + documentId + "/words/"
    });

    static reducers = RecipeDocumentReducer;

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

    read(documentId: number) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            endpoints = constructor.endpoints,
            actions = constructor.actions;
        jQuery.getJSON(endpoints.read(documentId)).then(data => {
            this.store.dispatch({type: actions.read, document: data.document})
        });
    }

    words(documentId: number) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            endpoints = constructor.endpoints,
            actions = constructor.actions;
        jQuery.getJSON(endpoints.words(documentId)).then(data => {
            this.store.dispatch({type: actions.words, documentId: documentId, words: data.words});
        });
    }
}

export interface IRecipeDocument {
    recipe_document_id: number;
    title: string;
    html: string;
    url: string;
    words?: RecipeDocumentWord[];
}

export interface RecipeDocumentWord {
    recipe_document_word_id: number;
    word: string;
    document_position: number;
    element_position: number;
    element_tag: string;
    original_format?: string;
}