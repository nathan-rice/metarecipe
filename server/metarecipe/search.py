from collections import namedtuple
import exceptions
import requests
import re
import urllib
import json
from lxml import html


SearchResult = namedtuple("SearchResult", ["title", "author", "url"])


class SearchRequestException(exceptions.Exception):
    pass


class FoodComSearch(object):

    json_extractor = re.compile(r"var searchResults = (.*);\r\nFD.searchParameters")

    def __init__(self, search_term):
        self.search_term = search_term

    def __iter__(self):

        def format_result(recipe_data):
            # The recipe data from food.com includes both the user's username and real name.  Leaning towards real
            # names. Note that food.com has made first and last names optional for the user.
            if "recipe_user_first_name" in recipe_data:
                name = recipe_data["recipe_user_first_name"] + recipe_data.get("recipe_user_last_name")
            else:
                name = recipe_data["main_username"]
            return SearchResult(recipe_data["main_title"], name, recipe_data["record_url"])

        def get_next_results_page():
            response = requests.get("http://www.food.com/search/" + urllib.quote_plus(self.search_term))
            if not response.status_code == requests.codes.ok:
                raise SearchRequestException(response)
            recipe_json = self.json_extractor.findall(response.text)
            if not recipe_json:
                # Not sure whether this should return an empty tuple, or raise an exception...  Need to learn more
                # about Food.com search functionality.
                pass
            recipe_data = json.loads(recipe_json)
            return [format_result(recipe) for recipe in recipe_data["response"]["results"]]

        while True:
            current_page_results = get_next_results_page()
            if not current_page_results:
                break
            for result in current_page_results:
                yield result


class FoodNetworkSearch(object):
    def __init__(self, search_term, page=1):
        self.search_term = search_term
        self.page = page
        self.length = None  # Not sure if this is kosher,

    def __len__(self):
        if self.length is None:
            # Fixme: pull in a page and get the total result count from it to set the length property
            pass
        return self.length

    def __iter__(self):

        def format_result(recipe_etree):
            """Transforms a Food Network recipe search result element tree into a Metarecipe SearchResult object"""
            (recipe_link, author_link) = recipe_etree.xpath("header/*/a")
            title = recipe_link.text.strip()
            author = author_link.text.strip()
            url = "http://www.foodnetwork.com" + recipe_link.attrib["href"]
            return SearchResult(title, author, url)

        def get_next_results_page():
            params = {"searchTerm": self.search_term, "page": self.page}
            response = requests.get("http://www.foodnetwork.com/search/search-results.html", params=params)
            if not response.status_code == requests.codes.ok:
                raise SearchRequestException(response)
            # Having the page increment after the exception forces the page to come down correctly before moving on.
            self.page += 1
            root = html.fromstring(response.text)
            recipes = root.xpath(".//article[@class='recipe']")
            return [format_result(recipe) for recipe in recipes]

        while True:
            current_page_results = get_next_results_page()
            if not current_page_results:
                break
            for result in current_page_results:
                yield result
