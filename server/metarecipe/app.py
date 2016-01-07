from flask import Flask
from . import endpoints

app = Flask(__name__, static_folder='../../client/components/', static_url_path='/static')

app.register_blueprint(endpoints.recipe_search)