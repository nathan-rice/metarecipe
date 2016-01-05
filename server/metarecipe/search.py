import requests
from lxml import etree


class FoodNetworkSearch(object):
    def __init__(self, search_term):
        response = requests.get("http://www.foodnetwork.com/search/search-results.html",
                                params={"searchTerm": search_term})
        root = etree.parse(response.text)

    def __iter__(self):
        pass