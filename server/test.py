from itertools import islice
from metarecipe.search import *

if __name__ == "__main__":
    fn = FoodNetworkSearch("cinnamon rolls")
    for recipe in islice(fn, 0, 10):
        print recipe


