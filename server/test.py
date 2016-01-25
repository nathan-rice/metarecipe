import metarecipe.models as m
from metarecipe.app import app, db

if __name__ == "__main__":
    with app.test_request_context():
        whole_wheat_pancakes_recipe = m.RecipeDocument.query.filter(m.RecipeDocument.recipe_document_id == 32).first()
        whole_wheat_pancakes_recipe.words = m.RecipeDocument.get_document_words(whole_wheat_pancakes_recipe.html)
        db.session.commit()

