from flask import Flask
from .endpoints import recipe_search
from .models import db


app = Flask(__name__, static_folder='../../client/', static_url_path='/client')
app.config.from_envvar("metarecipe_config")
app.register_blueprint(recipe_search, url_prefix='/search')

db.init_app(app)