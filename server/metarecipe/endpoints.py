import json
from flask import Blueprint, request, jsonify

from . import search

recipe_search = Blueprint('recipe_search', __name__)


@recipe_search.route('/by_site/food_network/')
def food_network():
    search_term = request.args.get("search")
    starting_page = request.args.get("page", 1)
    fn_search = search.FoodNetworkSearch(search_term, starting_page)
    results = fn_search.get_next_results_page()
    return jsonify(results=results, next_page=fn_search.current_page)


@recipe_search.route('/by_site/food_com/')
def food_com():
    search_term = request.args.get("search")
    starting_page = request.args.get("page", 1)
    fc_search = search.FoodComSearch(search_term, starting_page)
    results = fc_search.get_next_results_page()
    return jsonify(results=results, next_page=fc_search.current_page)


@recipe_search.route('/retrieve', methods=["POST"])
def retrieve():
    config = request.get_json()
