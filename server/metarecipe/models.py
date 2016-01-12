import datetime
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.retrieval_timestamp = datetime.datetime.now()

    @property
    def as_dict(self):
        return {
            "recipe_document_id": self.recipe_document_id,
            "title": self.title,
            "html": self.html,
            "url": self.url,
            "retrieval_timestamp": self.retrieval_timestamp
        }


class RecipeDocumentTagSet(db.Model):
    __tablename__ = "recipe_document_tagset"


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