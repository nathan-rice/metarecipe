import sqlalchemy as sa
import sqlalchemy.orm as orm
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class RecipeDocument(Base):
    """Model to retain recipe provenance."""
    __tablename__ = "recipe_document"
    recipe_document_id = sa.Column(sa.Integer, primary_key=True)
    html = sa.Column(sa.Unicode)
    url = sa.Column(sa.Text)
    retrieval_timestamp = sa.Column(sa.DateTime)


class Recipe(Base):
    __tablename__ = "recipe"
    recipe_id = sa.Column(sa.Integer, primary_key=True)
    preparation_time = sa.Column(sa.Time)
    cooking_time = sa.Column(sa.Time)
    other_time = sa.Column(sa.Time)
    # Do we want to rely on the total time value from page?  For now we will, can always remove it later
    total_time = sa.Column(sa.Time)


class Ingredient(Base):
    __tablename__ = "ingredient"
    ingredient_id = sa.Column(sa.Integer, primary_key=True)
    ingredient_name = sa.Column(sa.Text)
    about = sa.Column(sa.Text)
    culinary_history = sa.Column(sa.Text)
    # We need ingredient nutritional info here


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredient"
    recipe_ingredient_id = sa.Column(sa.Integer, primary_key=True)

    recipe_component = sa.Column(sa.Text)  # for recipes with multiple "parts"

    recipe_quantity = sa.Column(sa.Float)
    recipe_quantity_units = sa.Column(sa.Text)

    ingredient_id = sa.Column(sa.Integer, sa.ForeignKey("ingredient.ingredient_id"))
    ingredient = orm.relationship(Ingredient, backref="recipe_instances")
    ingredient_form = sa.Column(sa.Text)  # this might want to become its own entity

    recipe_id = sa.Column(sa.Integer(), sa.ForeignKey("recipe"))
    recipe = orm.relationship(Recipe, backref="ingredients")


class RecipeStep(Base):
    __tablename__ = "recipe_step"
    recipe_step_id = sa.Column(sa.Integer, primary_key=True)
    text = sa.Column(sa.Text)

    recipe_step_group_id = sa.Column(sa.Integer, sa.ForeignKey("recipe_step_group.recipe_step_group_id"))
    recipe_step_group = orm.relationship("RecipeStepGroup")

    recipe_id = sa.Column(sa.Integer, sa.ForeignKey("recipe.recipe_id"))
    recipe = orm.relationship(Recipe, backref="steps")


class RecipeStepGroup(Base):
    __tablename__ = "recipe_step_group"
    recipe_step_group_id = sa.Column(sa.Integer, primary_key=True)

    title = sa.Column(sa.Text)