import os
from flask import Flask
from . import endpoints
from . import models


app = Flask(__name__, static_folder='../../client/', static_url_path='/client')
app.config.from_envvar("metarecipe_config")
app.register_blueprint(endpoints.recipe_search, url_prefix='/search')

models.db.init_app(app)