from itertools import islice
from metarecipe.search import *

if __name__ == "__main__":
    fn = FoodComSearch("cinnamon rolls")
    for recipe in islice(fn, 0, 20):
        print recipe


