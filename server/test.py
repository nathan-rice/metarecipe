from itertools import islice
from metarecipe.search import *
from metarecipe.importer import HTMLImporter

if __name__ == "__main__":
    fn = FoodComSearch("cinnamon rolls")
    for (i, recipe) in enumerate(islice(fn, 0, 3)):
        result = HTMLImporter.from_url(recipe.url)
        with open("food.com_cinnamon-rolls." + str(i) + ".html", 'w') as f:
            f.write("<head><meta charset='UTF-8'></head>" + result.html)


