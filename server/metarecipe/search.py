from collections import namedtuple
import requests
import re
import urllib
import json
from lxml import html


SearchResult = namedtuple("SearchResult", ["title", "author", "url", "result_id"])


class SearchRequestException(Exception):
    pass


class BaseSearch(object):
    def __init__(self, search_term, start_page=1):
        self.search_term = search_term
        self.current_page = int(start_page)

    def get_next_results_page(self):
        results = self.get_results_page(self.current_page)
        self.current_page += 1
        return results

    def __iter__(self):
        while True:
            current_page_results = self.get_next_results_page()
            if not current_page_results:
                break
            for result in current_page_results:
                yield result


class FoodComSearch(BaseSearch):

    json_extractor = re.compile(r"var searchResults = (.*);\r\nFD.searchParameters")

    @staticmethod
    def _format_result(recipe_data, i):
        # The recipe data from food.com includes both the user's username and real name.  Leaning towards real
        # names. Note that food.com has made first and last names optional for the user.
        if "recipe_user_first_name" in recipe_data:
            name = " ".join((recipe_data["recipe_user_first_name"], recipe_data.get("recipe_user_last_name", "")))
        else:
            name = recipe_data["main_username"]
        return SearchResult(recipe_data["main_title"], name, recipe_data["record_url"], i)

    def get_results_page(self, page):
        params = {"pn": page}
        quoted_search = urllib.parse.quote_plus(self.search_term)
        response = requests.get("http://www.food.com/search/" + quoted_search, params=params)
        if not response.status_code == requests.codes.ok:
            raise SearchRequestException(response)
        recipe_json = self.json_extractor.findall(response.text)[0]
        if not recipe_json:
            # Not sure whether this should return an empty tuple, or raise an exception...  Need to learn more
            # about Food.com search functionality.
            return []
        recipe_data = json.loads(recipe_json)
        return [self._format_result(recipe, (page - 1) * 10 + i) for (i, recipe) in
                enumerate(recipe_data["response"]["results"]) if "recipe_id" in recipe]


class FoodNetworkSearch(BaseSearch):
    @staticmethod
    def _format_result(recipe_etree, i):
        """Transforms a Food Network recipe search result element tree into a Metarecipe SearchResult object"""
        links = recipe_etree.xpath("header/*/a")
        recipe_link = links[0]
        title = recipe_link.text.strip()
        url = "http://www.foodnetwork.com" + recipe_link.attrib["href"]
        if len(links) > 1:
            author_link = links[1]
            author = author_link.text.strip()
        else:
            author = ""

        return SearchResult(title, author, url, i)

    def get_results_page(self, page):
        params = {"searchTerm": self.search_term, "page": page}
        response = requests.get("http://www.foodnetwork.com/search/search-results.html", params=params)
        if not response.status_code == requests.codes.ok:
            raise SearchRequestException(response)
        root = html.fromstring(response.text)
        recipes = root.xpath(".//article[@class='recipe']")
        return [self._format_result(recipe, (page - 1) * 10 + i) for (i, recipe) in enumerate(recipes)]
