import requests
import re
from lxml.html.clean import Cleaner

from . import models


class ImporterException(Exception):
    pass


class HTMLImporter(object):

    _multiple_whitespace_cleaner = re.compile(r"\s+")

    @classmethod
    def _sanitize_html(cls, input_html):
        cleaner = Cleaner(remove_unknown_tags=False, allow_tags=["ol", "ul", "li", "p", "h1", "h2", "h3", "h4", "h5", "h6"])
        cleaned_html = cleaner.clean_html(input_html)
        return cls._multiple_whitespace_cleaner.sub(" ", cleaned_html)

    @classmethod
    def from_url(cls, url, metadata=None):
        # Using a generic metadata object here instead of individual parameters because they are likely to change
        response = requests.get(url)
        if not response.ok:
            raise ImporterException(response)
        else:
            html = response.text
            safe_html = cls._sanitize_html(html)
            return models.RecipeDocument(html=safe_html, url=url)