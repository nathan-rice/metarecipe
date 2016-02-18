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
    __tablename__ = "recipe_document_word_tag"
    recipe_document_word_tag_id = db.Column(db.Integer, primary_key=True)
    tag = db.Column(db.Unicode)

    recipe_document_word_id = db.Column(db.Integer, db.ForeignKey(RecipeDocumentWord.recipe_document_word_id))
    word = db.relationship(RecipeDocumentWord, backref="tags")

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


class Ingredient(db.Model):
    __tablename__ = "ingredient"
    ingredient_id = db.Column(db.Integer, primary_key=True)
    ingredient_name = db.Column(db.Text)
    about = db.Column(db.Text)
    culinary_history = db.Column(db.Text)
    # Wall of nutrition information crits you for 10,000
    protein = db.Column(db.Float)
    fat = db.Column(db.Float)
    carbohydrate = db.Column(db.Float)
    ash = db.Column(db.Float)
    energy = db.Column(db.Float)
    starch = db.Column(db.Float)
    sucrose = db.Column(db.Float)
    glucose = db.Column(db.Float)
    fructose = db.Column(db.Float)
    lactose = db.Column(db.Float)
    maltose = db.Column(db.Float)
    galactose = db.Column(db.Float)
    ethanol = db.Column(db.Float)
    water = db.Column(db.Float)
    caffeine = db.Column(db.Float)
    theobromine = db.Column(db.Float)
    total_sugar = db.Column(db.Float)
    fiber = db.Column(db.Float)
    calcium = db.Column(db.Float)
    iron = db.Column(db.Float)
    magnesium = db.Column(db.Float)
    phosphorus = db.Column(db.Float)
    potassium = db.Column(db.Float)
    sodium = db.Column(db.Float)
    zinc = db.Column(db.Float)
    copper = db.Column(db.Float)
    fluoride = db.Column(db.Float)
    manganese = db.Column(db.Float)
    selenium = db.Column(db.Float)
    vitamin_a = db.Column(db.Float)
    retinol = db.Column(db.Float)
    beta_carotene = db.Column(db.Float)
    alpha_carotene = db.Column(db.Float)
    vitamin_e = db.Column(db.Float)
    vitamin_d = db.Column(db.Float)
    vitamin_d2 = db.Column(db.Float)
    vitamin_d3 = db.Column(db.Float)
    cryptoxanthin = db.Column(db.Float)
    lutein_zeaxanthin = db.Column(db.Float)
    beta_tocopherol = db.Column(db.Float)
    gamma_tocopherol = db.Column(db.Float)
    delta_tocopherol = db.Column(db.Float)
    alpha_tocotrienol = db.Column(db.Float)
    beta_tocotrienol = db.Column(db.Float)
    gamma_tocotrienol = db.Column(db.Float)
    delta_tocotrienol = db.Column(db.Float)
    vitamin_c = db.Column(db.Float)
    thiamine = db.Column(db.Float)
    riboflavin = db.Column(db.Float)
    niacin = db.Column(db.Float)
    pantothenic_acid = db.Column(db.Float)
    vitamin_b6 = db.Column(db.Float)
    folic_acid = db.Column(db.Float)
    folate = db.Column(db.Float)
    folate_dfe = db.Column(db.Float)
    betaine = db.Column(db.Float)
    tryptophan = db.Column(db.Float)
    threonine = db.Column(db.Float)
    isoleucine = db.Column(db.Float)
    leucine = db.Column(db.Float)
    lysine = db.Column(db.Float)
    methionine = db.Column(db.Float)
    cystine = db.Column(db.Float)
    phenylalanine = db.Column(db.Float)
    tyrosine = db.Column(db.Float)
    valine = db.Column(db.Float)
    arginine = db.Column(db.Float)
    histidine = db.Column(db.Float)
    alanine = db.Column(db.Float)
    aspartic_acid = db.Column(db.Float)
    glutamic_acid = db.Column(db.Float)
    glycine = db.Column(db.Float)
    proline = db.Column(db.Float)
    serine = db.Column(db.Float)
    hydroxyproline = db.Column(db.Float)
    vitamin_e_added = db.Column(db.Float)
    vitamin_b12_added = db.Column(db.Float)
    cholesterol = db.Column(db.Float)
    saturated_fatty_acids = db.Column(db.Float)
    monounsaturated_fatty_acids = db.Column(db.Float)
    polyunsaturated_fatty_acids = db.Column(db.Float)
    trans_fatty_acids = db.Column(db.Float)
    butyric_acid = db.Column(db.Float)
    caprioc_aicd = db.Column(db.Float)
    caprylic_acid = db.Column(db.Float)
    capric_acid = db.Column(db.Float)
    lauric_acid = db.Column(db.Float)
    myristic_acid = db.Column(db.Float)
    pentadecylic_acid = db.Column(db.Float)
    palmitic_acid = db.Column(db.Float)
    margaric_acid = db.Column(db.Float)
    stearic_acid = db.Column(db.Float)
    arachidic_acid = db.Column(db.Float)
    lignoceric_acid = db.Column(db.Float)
    c18_n1_undifferentiated = db.Column(db.Float)
    c18_n2_undifferentiated = db.Column(db.Float)
    c18_n3_undifferentiated = db.Column(db.Float)
    c20_n4_undifferentiated = db.Column(db.Float)
    docosahexaenoic_acid = db.Column(db.Float)
    behenic_acid = db.Column(db.Float)
    myristoleic_acid = db.Column(db.Float)
    palmitoleic_acid = db.Column(db.Float)
    oleic_acid = db.Column(db.Float)
    erucic_acid = db.Column(db.Float)
    c16_n1_undifferentiated = db.Column(db.Float)
    stearidonic_acid = db.Column(db.Float)
    gadoleic_acid = db.Column(db.Float)
    eicosapentaenoic_acid = db.Column(db.Float)
    c22_n1_undifferentiated = db.Column(db.Float)
    docosapentaenoic_acid = db.Column(db.Float)
    phytosterols = db.Column(db.Float)
    sigmasterol = db.Column(db.Float)
    camesterol = db.Column(db.Float)
    beta_sitosterol = db.Column(db.Float)
    c18_n2_trans_not_further_defined = db.Column(db.Float)
    trans_monoenolic_fatty_acids = db.Column(db.Float)
    trans_polyenolic_fatty_acids = db.Column(db.Float)
    tridecyclic_acid = db.Column(db.Float)
    c16_n1_trans = db.Column(db.Float)
    c18_n1_trans = db.Column(db.Float)
    c22_n1_trans = db.Column(db.Float)
    c18_n2_trans_trans = db.Column(db.Float)
    c18_n2_cla = db.Column(db.Float)
    nervonic_acid = db.Column(db.Float)  # 24:1 cis
    alpha_linoleic_acid = db.Column(db.Float)  # 18:3 omega-3 cis,cis,cis
    eicosatrienoic_acid = db.Column(db.Float)  # 20:3 omega-3
    dihomo_gamma_linolenic_acid = db.Column(db.Float)  # 20:3 omega-6
    arachidonic_acid = db.Column(db.Float)  # 20:4 omega-6
    c18_n3_i = db.Column(db.Float)
    heneicosapentaenoic_acid = db.Column(db.Float)  # 20:5 omega-3
    adrenic_acid = db.Column(db.Float)  # 22:4 omega-6
    vaccenic_acid = db.Column(db.Float)  # 18:1 trans omega-7


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