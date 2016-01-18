import datetime

import re
import lxml.html
from collections import defaultdict, namedtuple
from itertools import count
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class RecipeDocument(db.Model):
    """Model to retain recipe provenance."""
    __tablename__ = "recipe_document"
    recipe_document_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Text)
    html = db.Column(db.Unicode)
    url = db.Column(db.Text, unique=True)
    retrieval_timestamp = db.Column(db.DateTime)

    recipe_id = db.Column(db.Integer, db.ForeignKey("recipe.recipe_id"))
    recipe = db.relationship("Recipe")

    _all_word_re = re.compile(r"(\d+\s*\d?[/⁄]?\d?|[-'\w]+|.*[:°.].*)")
    _number_re = re.compile(r"(\d+\s*\d?[/⁄]?\d?)")
    _symbol_re = re.compile(r"(.*[:°.].*)")

    _FormattedWord = namedtuple("FormattedWord", ["word", "original_formatting"])

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.retrieval_timestamp = datetime.datetime.now()
        self.words = self.get_document_words(self.html)

    @classmethod
    def _transform_word(cls, word_):
        # Numbers are extracted and replaced with a hash to improve model performance
        if cls._number_re.match(word_):
            return cls._FormattedWord("#", word_)
        # The space around symbols is retained to improve document rendering
        elif cls._symbol_re.match(word_):
            return cls._FormattedWord(word_.strip(), word_)
        else:
            return cls._FormattedWord(word_.strip(), None)

    @classmethod
    def _extract_words(cls, text):
        return [word_ for word_ in cls._all_word_re.findall(text or '')]

    @classmethod
    def get_document_words(cls, html):
        results = []
        document = lxml.html.fromstring(html)
        elements = document.iter()
        document_position = count()
        element_position = defaultdict(lambda: count())
        for element in elements:
            text_words = [cls._transform_word(word) for word in cls._extract_words(element.text)]
            tail_words = [cls._transform_word(word) for word in cls._extract_words(element.tail)]
            for (doc_pos, el_pos, transformed) in zip(document_position, element_position[element], text_words):
                new_document = RecipeDocumentWord(
                    word=transformed.word,
                    document_position=doc_pos,
                    element_position=el_pos,
                    element_tag=element.tag,
                    original_format=transformed.original_formatting)
                results.append(new_document)
            for (doc_pos, el_pos, transformed) in zip(document_position, element_position[element.getparent()], tail_words):
                new_document = RecipeDocumentWord(
                    word=transformed.word,
                    document_position=doc_pos,
                    element_position=el_pos,
                    element_tag=element.tag,
                    original_format=transformed.original_formatting)
                results.append(new_document)
        return results

    @property
    def as_dict(self):
        return {
            "recipe_document_id": self.recipe_document_id,
            "title": self.title,
            "html": self.html,
            "url": self.url
        }


class RecipeDocumentTagSet(db.Model):
    __tablename__ = "recipe_document_tag_set"
    recipe_document_tagset_id = db.Column(db.Integer, primary_key=True)

    recipe_document_id = db.Column(db.Integer, db.ForeignKey(RecipeDocument.recipe_document_id))
    recipe_document = db.relationship(RecipeDocument, backref="tag_sets")


class RecipeDocumentWord(db.Model):
    __tablename__ = "recipe_document_word"
    recipe_document_word_id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.Unicode)
    document_position = db.Column(db.Integer)
    element_position = db.Column(db.Integer)
    element_tag = db.Column(db.Text)
    original_format = db.Column(db.String)

    recipe_document_id = db.Column(db.Integer, db.ForeignKey(RecipeDocument.recipe_document_id))
    recipe_document = db.relationship(RecipeDocument, backref="words")

    @property
    def as_dict(self):
        return {
            "recipe_document_word_id": self.recipe_document_word_id,
            "word": self.word,
            "document_position": self.document_position,
            "element_position": self.element_position,
            "element_tag": self.element_tag,
            "original_format": self.original_format
        }


class RecipeDocumentWordTag(db.Model):
    __tabname__ = "recipe_document_word_tag"
    recipe_document_word_tag_id = db.Column(db.Integer, primary_key=True)
    tag = db.Column(db.Unicode)

    recipe_document_word_id = db.Column(db.Integer, db.ForeignKey(RecipeDocumentWord.recipe_document_word_id))
    word = db.relationship(RecipeDocumentWord, backref="tags")

    recipe_document_tag_set_id = db.Column(db.Integer, db.ForeignKey(RecipeDocumentTagSet.recipe_document_tagset_id))
    tag_set = db.relationship(RecipeDocumentTagSet, backref="tags")


class Recipe(db.Model):
    __tablename__ = "recipe"
    recipe_id = db.Column(db.Integer, primary_key=True)
    preparation_time = db.Column(db.Time)
    cooking_time = db.Column(db.Time)
    other_time = db.Column(db.Time)
    # Do we want to rely on the total time value from page?  For now we will, can always remove it later
    total_time = db.Column(db.Time)


class Ingredient(db.Model):
    __tablename__ = "ingredient"
    ingredient_id = db.Column(db.Integer, primary_key=True)
    ingredient_name = db.Column(db.Text)
    about = db.Column(db.Text)
    culinary_history = db.Column(db.Text)
    # We need ingredient nutritional info here


class RecipeIngredient(db.Model):
    __tablename__ = "recipe_ingredient"
    recipe_ingredient_id = db.Column(db.Integer, primary_key=True)

    recipe_component = db.Column(db.Text)  # for recipes with multiple "parts"

    recipe_quantity = db.Column(db.Float)
    recipe_quantity_units = db.Column(db.Text)

    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredient.ingredient_id"))
    ingredient = db.relationship(Ingredient, backref="recipe_instances")
    ingredient_form = db.Column(db.Text)  # this might want to become its own entity

    recipe_id = db.Column(db.Integer(), db.ForeignKey("recipe"))
    recipe = db.relationship(Recipe, backref="ingredients")


class RecipeStep(db.Model):
    __tablename__ = "recipe_step"
    recipe_step_id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text)

    recipe_step_group_id = db.Column(db.Integer, db.ForeignKey("recipe_step_group.recipe_step_group_id"))
    recipe_step_group = db.relationship("RecipeStepGroup")

    recipe_id = db.Column(db.Integer, db.ForeignKey("recipe.recipe_id"))
    recipe = db.relationship(Recipe, backref="steps")


class RecipeStepGroup(db.Model):
    __tablename__ = "recipe_step_group"
    recipe_step_group_id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.Text)