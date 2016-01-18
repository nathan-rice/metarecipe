import requests
import re
from lxml.html.clean import Cleaner

from . import models


class ExtractorException(Exception):
    pass


class HTMLExtractor(object):

    _multiple_whitespace_cleaner = re.compile(r"\s+")
    _title_extractor = re.compile(r"<title>(.*)</title>", re.IGNORECASE)

    @classmethod
    def _sanitize_html(cls, input_html):
        cleaner = Cleaner(remove_unknown_tags=False, allow_tags=["ol", "ul", "li", "p", "h1", "h2", "h3", "h4", "h5", "h6"])
        cleaned_html = cleaner.clean_html(input_html)
        return cls._multiple_whitespace_cleaner.sub(" ", cleaned_html)

    @classmethod
    def from_url(cls, url):
        response = requests.get(url)
        if not response.ok:
            raise ExtractorException(response)
        else:
            html = response.text
            title_search = cls._title_extractor.search(html)
            if title_search:
                title = title_search.group(1)
            safe_html = cls._sanitize_html(html)
            return models.RecipeDocument(html=safe_html, url=url, title=title)
