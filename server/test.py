import metarecipe.models as m
from metarecipe.app import app, db

if __name__ == "__main__":
    with app.test_request_context():
        db.metadata.drop_all()
        db.metadata.create_all()
        # m.Ingredient.query.order_by(db.desc(db.func.similarity("chicken", m.Ingredient.ingredient_name))).limit(10).all()

