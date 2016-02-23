import datetime
import re
from fractions import Fraction
import lxml.html
from collections import defaultdict, namedtuple
from itertools import count, groupby
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

    _all_word_re = re.compile(r"(\d+\.\d+|\d+\s*\d?\s*[/⁄]\s*\d+|\d+|[-'a-zA-Z]+|\s*[:°.()&]\s*)")
    _number_re = re.compile(r"(\d+\.\d+|\d+\s*\d?\s*[/⁄]\s*\d+|\d+)")
    _symbol_re = re.compile(r"(\s*[:°.()]\s*)")

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
                    element_tag=element.getparent().tag,
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

    @property
    def grouped(self):
        last_element_position = -1
        elements = [[]]
        word_tags = defaultdict(lambda: set())
        for tag in self.tags:
            word_tags[tag.word].add(tag.tag)
        for word in sorted(word_tags):
            if word.element_position <= last_element_position:
                elements.append([])
            elements[-1].append(word)
            last_element_position = word.element_position
        TaggedWordGroup = namedtuple("TaggedWordGroup", ["tags", "words"])
        return [[TaggedWordGroup(key, tuple(group)) for key, group in
                 groupby(element, lambda word: frozenset(word_tags[word])) if key] for element in elements]


class RecipeDocumentWord(db.Model):
    __tablename__ = "recipe_document_word"
    recipe_document_word_id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.Unicode)
    document_position = db.Column(db.Integer)
    element_position = db.Column(db.Integer)
    element_tag = db.Column(db.Text)
    original_format = db.Column(db.Text)

    recipe_document_id = db.Column(db.Integer, db.ForeignKey(RecipeDocument.recipe_document_id))
    recipe_document = db.relationship(RecipeDocument, backref="words")

    _number_re = re.compile(r"(\d+\s*/\s*\d+|\d*\.\d+|\d+)")

    def __hash__(self):
        return self.recipe_document_word_id

    def __lt__(self, other):
        return self.document_position < other.document_position

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

    @property
    def as_number(self):
        number_strings = self._number_re.findall(self.original_format)
        return float(sum(Fraction(re.sub(r"\s+", "", s)) for s in number_strings))


class RecipeDocumentWordTag(db.Model):
    __tablename__ = "recipe_document_word_tag"
    recipe_document_word_tag_id = db.Column(db.Integer, primary_key=True)
    tag = db.Column(db.Unicode)

    recipe_document_word_id = db.Column(db.Integer, db.ForeignKey(RecipeDocumentWord.recipe_document_word_id))
    word = db.relationship(RecipeDocumentWord)

    recipe_document_tag_set_id = db.Column(db.Integer, db.ForeignKey(RecipeDocumentTagSet.recipe_document_tagset_id))
    tag_set = db.relationship(RecipeDocumentTagSet, backref="tags")

    @property
    def as_dict(self):
        return {
            "recipe_document_word_tag_id": self.recipe_document_word_tag_id,
            "recipe_document_word_id": self.recipe_document_word_id,
            "tag": self.tag
        }


class Recipe(db.Model):
    __tablename__ = "recipe"
    recipe_id = db.Column(db.Integer, primary_key=True)
    preparation_time = db.Column(db.Time)
    cooking_time = db.Column(db.Time)
    other_time = db.Column(db.Time)
    # Do we want to rely on the total time value from page?  For now we will, can always remove it later
    total_time = db.Column(db.Time)
    title = db.Column(db.Unicode)


class Ingredient(db.Model):
    __tablename__ = "ingredient"
    ingredient_id = db.Column(db.Integer, primary_key=True)
    ingredient_name = db.Column(db.Text)
    about = db.Column(db.Text)
    culinary_history = db.Column(db.Text)


class IngredientName(db.Model):
    __tablename__ = "ingredient_name"
    ingredient_name_id = db.Column(db.Integer, primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredient.ingredient_id"))
    name = db.Column(db.Unicode)
    canonical = db.Column(db.Boolean)
    creator = db.Column(db.Integer)
    ingredient = db.relationship(Ingredient, backref="names")


class IngredientMeasure(db.Model):
    __tablename__ = "ingredient_preparation"
    ingredient_preparation_id = db.Column(db.Integer, primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredient.ingredient_id"))
    description = db.Column(db.Unicode)
    amount = db.Column(db.Float)
    weight = db.Column(db.Float)
    density = db.Column(db.Float)


class Nutrient(db.Model):
    __tablename__ = "nutrient"
    nutrient_id = db.Column(db.Integer, primary_key=True)
    display_name = db.Column(db.Unicode)
    scientific_name = db.Column(db.Unicode)
    measurement_unit = db.Column(db.Unicode)
    recommended_daily_intake = db.Column(db.Float)
    about = db.Column(db.Unicode)
    display = db.Column(db.Boolean)


class IngredientNutrient(db.Model):
    __tablename__ = "ingredient_nutrient"
    ingredient_nutrient_id = db.Column(db.Integer, primary_key=True)
    nutrient_id = db.Column(db.Integer, db.ForeignKey("nutrient.nutrient_id"))
    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredient.ingredient_id"))
    quantity = db.Column(db.Float)


class RecipeIngredient(db.Model):
    __tablename__ = "recipe_ingredient"
    recipe_ingredient_id = db.Column(db.Integer, primary_key=True)

    component = db.Column(db.Text)  # for recipes with multiple "parts"
    quantity = db.Column(db.Float)
    units = db.Column(db.Text)
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