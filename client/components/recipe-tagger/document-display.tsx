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
    documents: Immutable.List<crud.RecipeDocument>;
}

export class DocumentList extends React.Component<IDocumentListProperties, any> {
    render() {
        let documents = this.props.documents.map(document => <DocumentListEntry document={document}/>);
        return (
            <div>
                <h3>Document List</h3>
                <ul>
                    {documents}
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
                <li><a href="#" onClick={onClick}>{document.title}</a></li>
            )
        }
    }
}

export class FormattedDocument extends React.Component<any, any> {

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
                tagGroup = tags.takeWhile(tagIsLI);

            if (tagGroup.size > 0) {
                currentMarkup.push(<List items={tagGroup}/>);
                tags = tags.skipWhile(tagIsLI) as Immutable.List<Immutable.List<crud.RecipeDocumentWord>>;
            }
            else {
                let key = tags.first().first().recipe_document_word_id;
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
                        let mapper = word => <DocumentWord key={word.recipe_document_word_id} word={word}/>;
                        currentMarkup.push(tags.first().map(mapper));
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

    maybeSelectedText(event) {
        var selectionHtml = rangy.getSelection().toHtml(),
            elements = jQuery(selectionHtml).find('.document-word'),
            ids = elements.map((i, el) => parseInt(el.id));
        var jqs = jQuery(selection.toHtml());
    };

    componentDidMount() {
        this.getWords();
        document.onmouseup = this.maybeSelectedText;
    }

    componentDidUpdate(oldState, oldProps) {
        this.getWords();
    }

    render() {
        let document = this.props.document,
            words = document ? FormattedDocument.tagWordsToMarkup(document.words) : '';
        return (<div>{words}</div>);
    }
}

interface IListProperties {
    items: Immutable.Iterable<any, Immutable.List<crud.RecipeDocumentWord>>;
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
        let words = this.props.words.map(word => <DocumentWord key={word.recipe_document_word_id} word={word}/>);
        return (
            <li>{words}</li>
        )
    }
}

class Paragraph extends React.Component<ITagProperties, any> {
    render() {
        let words = this.props.words.map(word => <DocumentWord key={word.recipe_document_word_id} word={word}/>);
        return (
            <p>{words}</p>
        )
    }
}

class Heading1 extends React.Component<ITagProperties, any> {
    render() {
        let words = this.props.words.map(word => <DocumentWord key={word.recipe_document_word_id} word={word}/>);
        return (
            <h1>{words}</h1>
        )
    }
}

class Heading2 extends React.Component<ITagProperties, any> {
    render() {
        let words = this.props.words.map(word => <DocumentWord key={word.recipe_document_word_id} word={word}/>);
        return (
            <h2>{words}</h2>
        )
    }
}

class Heading3 extends React.Component<ITagProperties, any> {
    render() {
        let words = this.props.words.map(word => <DocumentWord key={word.recipe_document_word_id} word={word}/>);
        return (
            <h3>{words}</h3>
        )
    }
}

class Heading4 extends React.Component<ITagProperties, any> {
    render() {
        let words = this.props.words.map(word => <DocumentWord key={word.recipe_document_word_id} word={word}/>);
        return (
            <h4>{words}</h4>
        )
    }
}

class Heading5 extends React.Component<ITagProperties, any> {
    render() {
        let words = this.props.words.map(word => <DocumentWord key={word.recipe_document_word_id} word={word}/>);
        return (
            <h5>{words}</h5>
        )
    }
}

class Heading6 extends React.Component<ITagProperties, any> {
    render() {
        let words = this.props.words.map(word => <DocumentWord key={word.recipe_document_word_id} word={word}/>);
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
            text = word.original_format ? word.original_format : " " + word.word;
        return (
            <span className="document-word" id={word.recipe_document_word_id.toString()}>{text}</span>
        )
    }
}