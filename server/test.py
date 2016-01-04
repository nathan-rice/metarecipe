from metarecipe.importer import HTMLImporter

if __name__ == "__main__":
    recipe_document_1 = HTMLImporter.from_url("http://allrecipes.com/recipe/178526/johnson-family-cinnamon-rolls/")
    recipe_document_2 = HTMLImporter.from_url("http://www.foodnetwork.com/recipes/paula-deen/cinnamon-rolls-recipe.html")
    with open("foodnetwork-cinnamon-rolls.html", "w") as f:
        f.write(recipe_document_2.html)
    print "foo"

