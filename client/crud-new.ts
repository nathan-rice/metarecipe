/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/rangy/rangy.d.ts" />


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

    static create(o) {
        return new RecipeDocumentWord(o);
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

    static create(o) {
        return new RecipeDocumentWordTag(o)
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

    static create(o) {
        return new RecipeDocument(o);
    }
}