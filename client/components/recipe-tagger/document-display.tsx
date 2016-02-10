/// <reference path="../../definitions/react/react.d.ts" />
/// <reference path="../../definitions/react/react-global.d.ts" />
/// <reference path="../../definitions/immutable/immutable.d.ts" />
/// <reference path="../../definitions/rangy/rangy.d.ts" />

import api = require('api');
import crud = require('crud');
import React = require('react');
import jQuery = require('jquery');
import Immutable = require('immutable');

interface IDocumentListProperties {
    documents: Immutable.Iterable<any, crud.RecipeDocument>;
}

export class DocumentList extends React.Component<IDocumentListProperties, any> {
    render() {
        let documents = this.props.documents.map(document => <DocumentListEntry key={document.recipe_document_id}
                                                                                document={document}/>),
            documentList = Immutable.List(documents.values());
        return (
            <div>
                <h3>Document List</h3>
                <ul>
                    {documentList}
                </ul>
            </div>
        )
    }
}

class DocumentListEntry extends React.Component<any, any> {
    render() {
        let document = this.props.document,
            onClick = () => {
                return api.crud.recipeDocument.setSelectedDocumentID(document.recipe_document_id);
            };
        if (api.crud.recipeDocument.getSelectedDocumentID() == document.recipe_document_id) {
            return (
                <li className="active">{document.title}</li>
            )
        } else {
            return (
                <li>
                    <a href="#" onClick={onClick}>{document.title}</a>
                </li>
            )
        }
    }
}

function interleaveSpaces(words: Immutable.List<crud.RecipeDocumentWord>) {
    var lastWord, elements = [];
    words.forEach(word => {
        let isNonSymbolWord = !word.original_format || word.word == '#',
            wordNeedsWhiteSpace = lastWord ? lastWord.word != '(' && isNonSymbolWord : false;
        if (wordNeedsWhiteSpace) {
            elements.push(' ');
        }
        elements.push(<DocumentWord key={word.recipe_document_word_id} word={word}/>);
        lastWord = word;
    });
    return elements;
}

export class FormattedDocument extends React.Component<any, any> {

    constructor() {
        this.selectWords = this.selectWords.bind(this);
        this.state = {selectionRect: null};
        super();
    }

    static firstTag(words: Immutable.List<crud.RecipeDocumentWord>): Immutable.List<crud.RecipeDocumentWord> {
        var word;
        if (!words || !(word = words.first())) {
            // Returning undefined here stops execution of while loops based on .firstTag() output.
            return undefined;
        }
        var tagPosition = word.element_position - 1,
            lastTag = word.element_tag,
            tagWords = words.takeWhile(word => {
                var take = tagPosition < word.element_position && lastTag == word.element_tag;
                tagPosition = word.element_position;
                lastTag = word.element_tag;
                return take;
            });
        if (tagWords.size > 0) {
            return tagWords as Immutable.List<crud.RecipeDocumentWord>;
        }
    }

    static shiftTag(words: Immutable.List<crud.RecipeDocumentWord>): Immutable.List<crud.RecipeDocumentWord> {
        var word;
        if (!words || !(word = words.first())) {
            return words;
        }
        var tagPosition = word.element_position - 1,
            lastTag = word.element_tag,
            tagWords = words.skipWhile(word => {
                var take = tagPosition < word.element_position && lastTag == word.element_tag;
                tagPosition = word.element_position;
                lastTag = word.element_tag;
                return take;
            });
        if (tagWords.size > 0) {
            return tagWords as Immutable.List<crud.RecipeDocumentWord>;
        }
    }

    static wordsToTags(words: Immutable.List<crud.RecipeDocumentWord>): Immutable.List<Immutable.List<crud.RecipeDocumentWord>> {
        var tagWords, tags = Immutable.List<Immutable.List<crud.RecipeDocumentWord>>();
        while (tagWords = FormattedDocument.firstTag(words)) {
            tags = tags.push(tagWords);
            words = FormattedDocument.shiftTag(words);
        }
        return tags;
    }

    static tagWordsToMarkup(words: Immutable.List<crud.RecipeDocumentWord>) {
        var currentMarkup = [],
            tags = FormattedDocument.wordsToTags(words),
            tagIsLI = (tag) => (tag.first().element_tag == 'li');
        while (tags.first()) {
            let elementTag = tags.first().first().element_tag,
                tagGroup = tags.takeWhile(tagIsLI),
                key = tags.first().first().recipe_document_word_id;

            if (tagGroup.size > 0) {
                currentMarkup.push(<List key={key} items={tagGroup}/>);
                tags = tags.skipWhile(tagIsLI) as Immutable.List<Immutable.List<crud.RecipeDocumentWord>>;
            }
            else {
                switch (elementTag) {
                    case 'p':
                        currentMarkup.push(<Paragraph key={key} words={tags.first()}/>);
                        break;
                    case 'h1':
                        currentMarkup.push(<Heading1 key={key} words={tags.first()}/>);
                        break;
                    case 'h2':
                        currentMarkup.push(<Heading2 key={key} words={tags.first()}/>);
                        break;
                    case 'h3':
                        currentMarkup.push(<Heading3 key={key} words={tags.first()}/>);
                        break;
                    case 'h4':
                        currentMarkup.push(<Heading4 key={key} words={tags.first()}/>);
                        break;
                    case 'h5':
                        currentMarkup.push(<Heading5 key={key} words={tags.first()}/>);
                        break;
                    case 'h6':
                        currentMarkup.push(<Heading6 key={key} words={tags.first()}/>);
                        break;
                    default:
                        currentMarkup.push(interleaveSpaces(tags.first()));
                }
                tags = tags.shift();
            }
        }
        return currentMarkup;
    }

    getWords() {
        var document = this.props.document,
            words = document ? document.words.size : null;
        if (document && !words) {
            api.crud.recipeDocument.words(document.recipe_document_id);
        }
    }

    getTags() {
        var document = this.props.document,
            tags = document ? document.tags.size : null;
        if (document && !tags) {
            api.crud.recipeDocumentWordTag.loadDocumentWordTags(document.recipe_document_id);
        }
    }

    selectWords(e) {
        var selection = rangy.getSelection(),
            selectionHtml = selection.toHtml(),
            elements = jQuery(selectionHtml),
            getWordElements = el => el.find('span.document-word').add(el.filter('span.document-word')),
            wordElements, parentNode, ids;
        if (selectionHtml.length > 0) {
            wordElements = getWordElements(elements);
            if (wordElements.length == 0) {
                // This will occur if less than an entire word is selected
                parentNode = selection.anchorNode.parentNode;
                if (parentNode) {
                    wordElements = jQuery(parentNode);
                }
            }
            ids = wordElements.map((i, el) => parseInt(el.id));
            api.crud.recipeDocument.setSelectedWordIDs(ids);
            this.setState({selectionRect: selection.getRangeAt(0).nativeRange.getBoundingClientRect()})
        } else {
            this.setState({selectionRect: null});
        }
    };

    componentDidMount() {
        this.getWords();
        this.getTags();
    }

    componentDidUpdate(oldProps) {
        // Only update words and tags from the server if the component updated due to a change in the selected document.
        if (!oldProps || !oldProps.document || oldProps.document.recipe_document_id != this.props.document.recipe_document_id) {
            this.getWords();
            this.getTags();
        }
    }

    render() {
        let document = this.props.document,
            words = document ? FormattedDocument.tagWordsToMarkup(document.words) : '',
            rect = this.state.selectionRect,
            tagPallet = rect ? <TagPallet top={rect.top} left={rect.right + 50}/> : '';
        return (<div onMouseUp={this.selectWords}>{words}{tagPallet}</div>);
    }
}

interface IListProperties {
    items: Immutable.Iterable<any, Immutable.List<crud.RecipeDocumentWord>>;
    key: number;
}

class List extends React.Component<IListProperties, any> {
    render() {
        let items = this.props.items.map(item => <ListItem key={item.first().recipe_document_word_id} words={item}/>);
        return (
            <ul>{items}</ul>
        )
    }
}

interface ITagProperties {
    words: Immutable.List<crud.RecipeDocumentWord>;
    key: number;
}

class ListItem extends React.Component<ITagProperties, any> {
    render() {
        let words = interleaveSpaces(this.props.words);
        return (
            <li>{words}</li>
        )
    }
}

class Paragraph extends React.Component<ITagProperties, any> {
    render() {
        let words = interleaveSpaces(this.props.words);
        return (
            <p>{words}</p>
        )
    }
}

class Heading1 extends React.Component<ITagProperties, any> {
    render() {
        let words = interleaveSpaces(this.props.words);
        return (
            <h1>{words}</h1>
        )
    }
}

class Heading2 extends React.Component<ITagProperties, any> {
    render() {
        let words = interleaveSpaces(this.props.words);
        return (
            <h2>{words}</h2>
        )
    }
}

class Heading3 extends React.Component<ITagProperties, any> {
    render() {
        let words = interleaveSpaces(this.props.words);
        return (
            <h3>{words}</h3>
        )
    }
}

class Heading4 extends React.Component<ITagProperties, any> {
    render() {
        let words = interleaveSpaces(this.props.words);
        return (
            <h4>{words}</h4>
        )
    }
}

class Heading5 extends React.Component<ITagProperties, any> {
    render() {
        let words = interleaveSpaces(this.props.words);
        return (
            <h5>{words}</h5>
        )
    }
}

class Heading6 extends React.Component<ITagProperties, any> {
    render() {
        let words = interleaveSpaces(this.props.words);
        return (
            <h6>{words}</h6>
        )
    }
}

interface IDocumentWordProperties {
    word: crud.RecipeDocumentWord;
    key: number;
}

class DocumentWord extends React.Component<IDocumentWordProperties, any> {
    render() {
        var word = this.props.word,
            text = word.original_format ? word.original_format : word.word,
            tags = api.crud.recipeDocumentWordTag.getTagsForWord(this.props.word),
            classes = tags.reduce((old, current) => old + " " + current.tag, "document-word");
        return (
            <span className={classes} id={word.recipe_document_word_id.toString()}>{text}</span>
        )
    }
}

class TagPallet extends React.Component<any, any> {

    render() {
        var selectedWords = api.crud.recipeDocument.getSelectedWords(),
            selectedWordTags = api.crud.recipeDocumentWordTag.getCommonTagsForWords(selectedWords),
            tagger;
        if (selectedWordTags.contains("ingredient-list")) {
            tagger = <IngredientListTagger/>;
        } else if (selectedWordTags.contains("time")) {
            tagger = <TimeTagger/>;
        }
        return (
            <div style={{position: "fixed", top: this.props.top, left: this.props.left}}>
                {tagger}
                <SelectionTagList tags={selectedWordTags}/>
            </div>
        )
    }
}

class Tagger extends React.Component<any, any> {
    addTag(tagText) {
        return () => {
            return api.crud.recipeDocumentWordTag.create(tagText, api.crud.recipeDocument.getSelectedWordIDs());
        }
    }

    render() {
        return (
            <div className="btn-group">
                <button onClick={this.addTag("ingredients")} className="btn btn-default"><u>I</u>ngredients
                </button>
                <button onClick={this.addTag("directions")} className="btn btn-default"><u>D</u>irections
                </button>
                <button onClick={this.addTag("time")} className="btn btn-default"><u>T</u>ime
                </button>
                <button onClick={this.addTag("yield")} className="btn btn-default"><u>Y</u>ield
                </button>
            </div>
        )
    }
}

class IngredientListTagger extends Tagger {
    render() {
        return (
            <div className="btn-group">
                <button onClick={this.addTag("ingredients-heading")} className="btn btn-default"><u>H</u>eading
                </button>
                <button onClick={this.addTag("ingredient-quantity")} className="btn btn-default"><u>Q</u>uantity
                </button>
                <button onClick={this.addTag("ingredient-unit")} className="btn btn-default"><u>U</u>nit
                </button>
                <button onClick={this.addTag("ingredient-name")} className="btn btn-default"><u>N</u>ame
                </button>
            </div>
        )
    }
}

interface SelectionTagListProperties {
    tags: Immutable.Iterable<any, string>;
}

class TimeTagger extends Tagger {
    render() {
        return (
            <div className="btn-group">
                <button onClick={this.addTag("preparation-time")} className="btn btn-default"><u>P</u>reparation
                </button>
                <button onClick={this.addTag("cooking-time")} className="btn btn-default"><u>C</u>ooking
                </button>
            </div>
        )
    }
}

class SelectionTagList extends React.Component<SelectionTagListProperties, any> {
    render() {
        var tags = this.props.tags.map(tag => <SelectionTag tag={tag}/>);
        return (
            <ul className="list-inline">{tags}</ul>
        )
    }
}

interface SelectionTagProperties {
    tag: string;
}

class SelectionTag extends React.Component<SelectionTagProperties, any> {

    deleteTagForWords() {
        var selectedWords = api.crud.recipeDocument.getSelectedWords(),
            selectedWordTags = api.crud.recipeDocumentWordTag.getTagsForWords(selectedWords);
        api.crud.recipeDocumentWordTag.delete(selectedWordTags);
    }

    render() {
        return (
            <li>
                <span className="label label-default">{this.props.tag}
                    <button style={{background: "none", border: "none"}}>
                        <span onClick={this.deleteTagForWords} className="glyphicon glyphicon-remove"/>
                    </button>
                </span>
            </li>
        )
    }
}