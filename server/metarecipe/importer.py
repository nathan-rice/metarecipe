import requests
import re
from lxml.html.clean import Cleaner

from . import models


class ImporterException(Exception):
    pass


class FoodComImporter(object):

    json_extractor = re.compile(r"")

    @classmethod
    def from_url(cls, url):
        response = requests.get(url)
        if not response.ok:
            raise ImporterException(response)
        else:
            recipe_proto_json = cls.json_extractor.findall(response.content)[0]
            # This needs to be processed further before it can be parsed by json


class HTMLImporter(object):

    @staticmethod
    def _sanitize_html(input_html):
        cleaner = Cleaner(remove_unknown_tags=False, allow_tags=["ol", "ul", "li", "p", "h1", "h2", "h3", "h4", "h5", "h6"])
        return cleaner.clean_html(input_html)

    @classmethod
    def from_url(cls, url, metadata=None):
        # Using a generic metadata object here instead of individual parameters because they are likely to change
        response = requests.get(url)
        if not response.ok:
            raise ImporterException(response)
        else:
            html = response.content
            safe_html = cls._sanitize_html(html)
            return models.RecipeDocument(html=safe_html, url=url)