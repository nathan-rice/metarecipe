from flask import Flask
from . import endpoints
from .models import db


app = Flask(__name__, static_folder='../../client/', static_url_path='/client')
app.config.from_envvar("metarecipe_config")
app.register_blueprint(endpoints.recipe_search, url_prefix='/search')
app.register_blueprint(endpoints.crud, url_prefix='/crud')

db.init_app(app)

# db.metadata.bind = app.config["SQLALCHEMY_DATABASE_URI"]
# db.metadata.drop_all()
# db.metadata.create_all()
