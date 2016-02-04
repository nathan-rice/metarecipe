/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/rangy/rangy.d.ts" />


import Immutable = require('immutable');
import jQuery = require('jquery');


class ObjectService {

    static crudRoot = '/crud/';

    static actions = class Actions {
        static list: string = 'GENERIC_LIST';
        static create: string = 'GENERIC_CREATE';
        static read: string = 'GENERIC_READ';
        static update: string = 'GENERIC_UPDATE';
        static delete: string = 'GENERIC_DELETE';
    };

    static endpoints = class Endpoints {
        static list: string = ObjectService.crudRoot;
        static create: string = ObjectService.crudRoot;
        static read: string | Function = ObjectService.crudRoot;
        static update: string | Function = ObjectService.crudRoot;
        static delete: string | Function = ObjectService.crudRoot;
    };

    static reducers = class ObjectReducer {
        static list: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
        static create: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
        static read: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
        static update: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
        static delete: (state: Immutable.Map<any, any>, action) => Immutable.Map<any, any> = (state, action) => state;
    };

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

const RecipeDocumentWordTagRecord = Immutable.Record({
    recipe_document_word_tag_id: 0,
    recipe_document_word_id: 0,
    tag: ''
});

export class RecipeDocumentWordTag extends RecipeDocumentWordTagRecord {
    recipe_document_word_tag_id: number;
    recipe_document_word_id: number;
    tag: string;

    static fromObject(o) {
        return new RecipeDocumentWordTag({
            recipe_document_word_tag_id: o.recipe_document_word_tag_id,
            recipe_document_word_id: o.recipe_document_word_id,
            tag: o.tag
        })
    }
}

const RecipeDocumentRecord = Immutable.Record({
    recipe_document_id: 0,
    title: '',
    html: '',
    url: '',
    words: Immutable.List(),
    tags: Immutable.List()
});

export class RecipeDocument extends RecipeDocumentRecord {
    recipe_document_id: number;
    title: string;
    html: string;
    url: string;
    words: Immutable.List<RecipeDocumentWord>;
    tags: Immutable.List<RecipeDocumentWordTag>;

    static fromObject(o) {
        return new RecipeDocument({
            recipe_document_id: o.recipe_document_id,
            title: o.title,
            html: o.html,
            url: o.url
        });
    }
}

export class RecipeDocumentService extends ObjectService {

    static crudRoot = ObjectService.crudRoot + "recipe_document/";

    static actions = class Actions extends ObjectService.actions {
        static list = 'LIST_RECIPE_DOCUMENTS';
        static read = 'READ_RECIPE_DOCUMENT';
        static words = 'GET_RECIPE_DOCUMENT_WORDS';
        static tags = 'GET_RECIPE_DOCUMENT_TAGS';
        static setSelectedDocumentID = 'SET_SELECTED_RECIPE_DOCUMENT';
        static setSelectedWordIDs = 'SET_SELECTED_WORD_IDS';
    };

    static endpoints = class Endpoints extends ObjectService.endpoints {
        static list = RecipeDocumentService.crudRoot;
        static read = (documentId: number) => RecipeDocumentService.crudRoot + documentId + "/";
        static words = (documentId: number) => RecipeDocumentService.crudRoot + documentId + "/words/";
        static tags = (documentId: number) => RecipeDocumentService.crudRoot + documentId + "/tags/";
    };

    static reducers = class Reducer extends ObjectService.reducers {
        static setSelectedDocument(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
            return state.set("selectedDocumentID", action.documentID);
        }

        static list(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
            return state.mergeIn(["documents"],
                action.documents
                    .map(RecipeDocument.fromObject)
                    .map(o => [o.recipe_document_id, o])
            );
        }

        static read(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
            if (!action.document) return state;
            return state.mergeIn(["documents", action.document.documentID], RecipeDocument.fromObject(action.document));
        }

        static words(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
            return state
                .mergeIn(["documents", action.documentID], {})
                .setIn(["documents", action.documentID, "words"], Immutable.List(action.words).map(RecipeDocumentWord.fromObject));
        }

        static tags(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
            return state
                .mergeIn(["documents", action.documentID], {})
                .setIn(["documents", action.documentID, "tags"], Immutable.List(action.tags).map(RecipeDocumentWordTag.fromObject));
        }

        static setSelectedWordIDs(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
            return state
                .set("selectedWordIDs", Immutable.List(action.wordIDs))
        }
    };

    static defaultState:Immutable.Map<string, any> = Immutable.fromJS({
        documents: {},
        selectedDocumentID: 0,
        selectedWordIDs: []
    });

    getDocument(documentId: number): RecipeDocument {
        return this.getState().getIn(["documents", documentId]);
    }

    getDocuments(): Immutable.List<RecipeDocument> {
        var documentIterator = this.getState().get("documents").values();
        return Immutable.List(documentIterator) as Immutable.List<RecipeDocument>;
    }

    getSelectedDocumentID(): number {
        return this.getState().get("selectedDocumentID")
    }

    getSelectedDocument(): RecipeDocument {
        var state = this.getState(), documentId = state.get("selectedDocumentID");
        return state.getIn(["documents", documentId]);
    }

    setSelectedDocumentID(documentId: number) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            actions = constructor.actions;
        this.store.dispatch({type: actions.setSelectedDocumentID, documentID: documentId});
    }

    setSelectedWordIDs(wordIDs) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            actions = constructor.actions;
        this.store.dispatch({type: actions.setSelectedWordIDs, wordIDs: wordIDs});
    }

    getSelectedWordIDs() {
        return this.getState().get("selectedWordIDs");
    }

    getTagsForWord(word: RecipeDocumentWord) {
        var tags = this.getState().getIn(["documents", this.getSelectedDocumentID(), "tags"]);
        return tags.filter((tag: RecipeDocumentWordTag) => tag.recipe_document_word_id == word.recipe_document_word_id);
    }

    reduce(state: Immutable.Map<string, any>, action): Immutable.Map<any, any> {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            actions = constructor.actions,
            reducers = constructor.reducers;
        switch (action.type) {
            case actions.words:
                return reducers.words(state, action);
            case actions.tags:
                return reducers.tags(state, action);
            case actions.setSelectedDocumentID:
                return reducers.setSelectedDocument(state, action);
            case actions.setSelectedWordIDs:
                return reducers.setSelectedWordIDs(state, action);
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
            this.store.dispatch({type: actions.words, documentID: documentId, words: data.words});
        });
    }

    tags(documentId: number) {
        var constructor = (this.constructor as typeof RecipeDocumentService),
            endpoints = constructor.endpoints,
            actions = constructor.actions;
        return jQuery.getJSON(endpoints.tags(documentId)).then(data => {
            this.store.dispatch({type: actions.tags, documentID: documentId, tags: data.tags});
        });
    }
}

export class RecipeDocumentWordTagService extends ObjectService {

    static crudRoot = ObjectService.crudRoot + "recipe_document_word_tag/";

    static endpoints = class Endpoints extends ObjectService.endpoints {
        static create = RecipeDocumentWordTagService.crudRoot;
        static delete = RecipeDocumentWordTagService.crudRoot;
    };

    static reducers = class Reducers extends ObjectService.reducers {
        static create(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
            let oldTags = state.getIn(["documents", action.documentId, "tags"]),
                newTags = action.tags.map(RecipeDocumentWordTag.fromObject);
            return state
                .mergeIn(["documents", action.documentID], {})
                .setIn(["documents", action.documentID, "tags"], oldTags.concat(newTags));
        }

        static delete(state: Immutable.Map<any, any>, action): Immutable.Map<any, any> {
            let tags = state.getIn(["documents", action.documentID, "tags"]),
                isNotDeletedTag = tag => action.tagIDs.indexOf(tag.recipe_document_tag_id) == -1;
            return state
                .mergeIn(["documents", action.documentID], {})
                .setIn(["documents", action.documentID, "tags"], tags.filter(isNotDeletedTag));
        }
    };

    create(tagText: string, words: Immutable.Iterable<number, number>) {
        var constructor = (this.constructor as typeof RecipeDocumentWordTagService),
            endpoints = constructor.endpoints,
            actions = constructor.actions,
            tags = words.map(word => ({recipe_document_word_id: word, tag: tagText}));
        return jQuery.ajax({
            type: "POST",
            url: endpoints.create,
            data: JSON.stringify(tags.toJS()),
            contentType: "application/json; charset=utf-8",
            success: data => this.store.dispatch({type: actions.create, tags: data.tags})
        });
    }

    delete(tags: Immutable.Iterable<number, RecipeDocumentWordTag>) {
        var constructor = (this.constructor as typeof RecipeDocumentWordTagService),
            endpoints = constructor.endpoints,
            actions = constructor.actions,
            tagIDs = tags.map(tag => tag.recipe_document_word_tag_id);
        return jQuery.ajax({
            type: "POST",
            url: endpoints.delete,
            data: JSON.stringify(tags.toJS()),
            contentType: "application/json; charset=utf-8",
            success: () => this.store.dispatch({type: actions.delete, tagIDs: tagIDs})
        });
    }
}

export class ObjectManager {

    recipeDocument: RecipeDocumentService;
    recipeDocumentWordTag: RecipeDocumentWordTagService;

    static actions = {
        recipeDocument: RecipeDocumentService.actions,
        recipeDocumentWordTag: RecipeDocumentWordTagService.actions
    };

    static endpoints = {
        recipeDocument: RecipeDocumentService.endpoints,
        recipeDocumentWordTag: RecipeDocumentWordTagService.endpoints
    };

    static reducers = {
        recipeDocument: RecipeDocumentService.reducers,
        recipeDocumentWordTag: RecipeDocumentWordTagService.reducers
    };

    static defaultState = Immutable.fromJS({
        recipeDocument: RecipeDocumentService.defaultState,
        recipeDocumentWordTag: RecipeDocumentWordTagService.defaultState
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
        this.recipeDocumentWordTag = new RecipeDocumentWordTagService(() => getState().get("recipeDocumentWordTag"), store);
    }
}