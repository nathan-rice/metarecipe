/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />
/// <reference path="definitions/rangy/rangy.d.ts" />

import Radical = require('radical');
import RadicalPostgrest = require('radical-postgrest');


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

class RecipeDocumentWordModel extends RadicalPostgrest.Model {
    name = "recipe_document_word";
    recipe_document_word_id = new RadicalPostgrest.NumericField({primary: true});
    word = new RadicalPostgrest.TextField();
    document_position = new RadicalPostgrest.NumericField();
    element_position = new RadicalPostgrest.NumericField();
    element_tag = new RadicalPostgrest.TextField();
    original_format = new RadicalPostgrest.TextField();
    factory = RecipeDocumentWord.create;
}

class RecipeDocumentWordService extends RadicalPostgrest.CollectionDataService {
    defaultState = Immutable.fromJS({instances: {}, selected: []});
    model = RecipeDocumentWordModel.create();
    url = "/crud/";

    setSelectedWords = Radical.CollectionAction.create(function (words) {

    });

    getSelectedWords = Radical.CollectionAction.create(function () {

    });
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

class RecipeDocumentWordTagModel extends RadicalPostgrest.Model {
    name = "recipe_document_word_tag";
    recipe_document_word_tag_id = new RadicalPostgrest.NumericField({primary: true});
    recipe_document_word_id = new RadicalPostgrest.NumericField();
    tag = new RadicalPostgrest.TextField();
    factory = RecipeDocumentWordTag.create;
}

class RecipeDocumentWordTagService extends RadicalPostgrest.CollectionDataService {
    defaultState = Immutable.fromJS({instances: {}});
    model = RecipeDocumentWordTagModel.create();
    url = "/crud/";

    getTagsForWord = Radical.CollectionAction.create(function (action, word: RecipeDocumentWord) {
        return this.instances().filter(tag => tag.recipe_document_word_id == word.recipe_document_word_id);
    });

    getTagsForWords = Radical.CollectionAction.create(function (words: Immutable.Iterable<any, RecipeDocumentWord>) {
        let concatTags = (tags, word) => tags.concat(this.getTagsForWord(word));
        return words.reduce(concatTags, Immutable.List());
    });

    getCommonTagsForWords = Radical.CollectionAction.create(function (words: Immutable.Iterable<any, RecipeDocumentWord>) {
        let getTagStrings = word => this.getTagsForWord(word).map(tag => tag.tag),
            getCommonTags = (tags, word) => tags.intersect(getTagStrings(word)),
            tags = getTagStrings(words.first()),
            commonTags = words.rest().reduce(getCommonTags, Immutable.Set(tags));
        return commonTags;
    });
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

export class RecipeDocumentModel extends RadicalPostgrest.Model {
    name = "recipe_document";
    recipe_document_id = new RadicalPostgrest.NumericField({primary: true});
    title = new RadicalPostgrest.TextField();
    html = new RadicalPostgrest.TextField();
    url = new RadicalPostgrest.TextField();
    factory = RecipeDocument.create;
}

class RecipeDocumentService extends RadicalPostgrest.CollectionDataService {
    defaultState = Immutable.fromJS({instances: {}});
    model = RecipeDocumentModel.create();
    url = "/crud/";

    getDocument = Radical.CollectionAction.create(function (action, recipeDocumentId) {
        return this.instances().get(recipeDocumentId);
    });

    getDocuments = Radical.CollectionAction.create(function (action, recipeDocumentIds: Set<number>) {
        return this.instances().filter(instance => recipeDocumentIds.has(instance.recipe_document_id));
    });
}