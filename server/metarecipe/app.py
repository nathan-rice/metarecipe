from flask import Flask
from . import endpoints

app = Flask(__name__, static_folder='../../client/', static_url_path='/client')

app.register_blueprint(endpoints.recipe_search, url_prefix='/search')