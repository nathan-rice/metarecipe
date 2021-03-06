from itertools import groupby
from flask import Blueprint, request, jsonify, abort

from . import search
from . import models
from . import extractors

recipe_search = Blueprint('recipe_search', __name__)

crud = Blueprint('crud', __name__)

recipe_creation = Blueprint('recipe_creation', __name__)


@recipe_search.route('/site/food_network/')
def food_network():
    search_term = request.args.get("search")
    starting_page = request.args.get("page", 1)
    fn_search = search.FoodNetworkSearch(search_term, starting_page)
    results = fn_search.get_next_results_page()
    return jsonify(results=results, next_page=fn_search.current_page)


@recipe_search.route('/site/food_com/')
def food_com():
    search_term = request.args.get("search")
    starting_page = request.args.get("page", 1)
    fc_search = search.FoodComSearch(search_term, starting_page)
    results = fc_search.get_next_results_page()
    return jsonify(results=results, next_page=fc_search.current_page)


@recipe_search.route('/retrieve/', methods=["POST"])
def retrieve():
    targeted_results = request.get_json()
    targeted_urls = [r.get("url") for r in targeted_results]
    recipe_document_table = models.RecipeDocument.__table__
    url_column = recipe_document_table.c.url
    in_targeted_urls = url_column.in_(targeted_urls)
    select = models.db.select([url_column]).where(in_targeted_urls)
    present_urls = set(e[0] for e in models.db.engine.execute(select).fetchall())
    recipe_documents = [extractors.HTMLExtractor.from_url(url) for url in targeted_urls if url not in present_urls]
    models.db.session.add_all(recipe_documents)
    models.db.session.commit()
    return jsonify(recipe_documents=[document.as_dict for document in recipe_documents])


@crud.route('/recipe_document/')
def list_recipe_documents():
    documents = models.RecipeDocument.query.all()
    return jsonify(documents=[document.as_dict for document in documents])


@crud.route('/recipe_document/<int:document_id>/')
def get_recipe_document(document_id):
    document = models.RecipeDocument.query.filter(models.RecipeDocument.recipe_document_id == document_id).first()
    return jsonify(document=document.as_dict)


@crud.route('/recipe_document/<int:document_id>/words/')
def get_recipe_document_words(document_id):
    words = models.RecipeDocumentWord.query\
        .filter(models.RecipeDocumentWord.recipe_document_id == document_id)\
        .order_by(models.RecipeDocumentWord.document_position)\
        .all()
    return jsonify(words=[word.as_dict for word in words])


@crud.route('/recipe_document_word_tag/')
def get_recipe_document_word_tags():
    document_id = request.args.get("recipe_document_id")
    tags = models.RecipeDocumentWordTag.query\
        .join(models.RecipeDocumentTagSet)\
        .filter(models.RecipeDocumentTagSet.recipe_document_id == document_id)\
        .all()
    return jsonify(tags=[tag.as_dict for tag in tags])


@crud.route('/recipe_document_word_tag/', methods=["POST"])
def create_recipe_document_word_tags():
    tags_json = request.get_json()
    if not tags_json:
        return ""
    # It is assumed that all words are from the same document, it might be a good idea to check and enforce this in
    # the future.
    document = models.RecipeDocument.query\
        .join(models.RecipeDocumentWord)\
        .filter(models.RecipeDocumentWord.recipe_document_word_id == tags_json[0]["recipe_document_word_id"])\
        .first()
    document_id = document.recipe_document_id
    # TODO: update tagset creation to be user specific (when we have users)
    recipe_document_tag_set = models.RecipeDocumentTagSet.query\
        .filter(models.RecipeDocumentTagSet.recipe_document_id == document_id)\
        .first()
    if not recipe_document_tag_set:
        recipe_document_tag_set = models.RecipeDocumentTagSet(recipe_document_id=document_id)
        models.db.session.add(recipe_document_tag_set)
    for tag_dict in tags_json:
        tag = models.RecipeDocumentWordTag(
            tag_set=recipe_document_tag_set,
            recipe_document_word_id=tag_dict["recipe_document_word_id"],
            tag=tag_dict["tag"]
        )
        models.db.session.add(tag)
    models.db.session.commit()
    return jsonify(tags=[tag.as_dict for tag in recipe_document_tag_set.tags])


@crud.route('/recipe_document_word_tag/', methods=["DELETE"])
def delete_recipe_document_word_tag():
    tag_ids = request.get_json()
    deleted = models.RecipeDocumentWordTag.query\
        .filter(models.RecipeDocumentWordTag.recipe_document_word_tag_id.in_(tag_ids))\
        .delete(synchronize_session=False)
    models.db.session.commit()
    if not deleted:
        return abort(404)
    else:
        return jsonify(deleted=deleted)


@crud.route('/recipe_document_word_tag/by_document:<int:document_id>/by_tag:<string:tag>/', methods=["DELETE"])
def delete_recipe_document_word_tag_by_tag(document_id, tag):
    predicate = models.db.and_(models.RecipeDocumentWordTag.tag == tag,
                               models.RecipeDocumentTagSet.recipe_document_id == document_id)
    deleted = models.RecipeDocumentWordTag.query\
        .join(models.RecipeDocumentTagSet)\
        .filter(predicate)\
        .delete()
    if not deleted:
        return abort(404)
    else:
        return jsonify(deleted=deleted)


@recipe_creation.route('/tag_set/<int:tag_set_id>/')
def recipe_from_tag_set(tag_set_id):
    tag_set = models.RecipeDocumentTagSet.query\
        .filter(models.RecipeDocumentTagSet.recipe_document_tagset_id == tag_set_id)\
        .first()
    recipe = {"ingredients": [], "directions": []}
    current_recipe_component = None
    current_ingredient = {}
    # First we need to group words by their tags
    for element in tag_set.groups:
        for tag_group in element:
            if "title" in tag_group.tags:
                recipe["title"] = " ".join(tag_group.words)
            elif "ingredients-heading" in tag_group.tags:
                current_recipe_component = " ".join(tag_group.words)
            elif "ingredient-name" in tag_group.tags:
                ingredient_name = " ".join(tag_group.words)
                name_similarity = models.db.func.similarity(models.IngredientName.name, ingredient_name)
                matching_ingredients = models.IngredientName.query\
                    .filter(models.db.desc(name_similarity))\
                    .limit(10)\
                    .all()
                current_ingredient["ingredient_name"] = ingredient_name
                current_ingredient["matching_ingredients"] = [name.as_dict for name in matching_ingredients]
            elif "ingredient-quantity" in tag_group.tags:
                current_ingredient["quantity"] = tag_group.words[0].as_number
            elif "ingredient-units" in tag_group.tags:
                current_ingredient["units"] = tag_group.words[0]
            elif "ingredient-preparation" in tag_group.tags:
                current_ingredient["preparation"] = " ".join(tag_group.words)
            elif "directions" in tag_group.tags:
                current_step = []
                last_word = None
                # We need to split the directions into discrete steps, based on sentences.
                for word in tag_group.words:
                    is_non_symbol_word = not word.original_format or word.word == "#"
                    if last_word and not last_word.word == '(' and is_non_symbol_word:
                        current_step.append(" ")
                    recipe["directions"].append(word.original_format or word.word)
                    last_word = word
                    if word.word == '.':
                        recipe["directions"].append("".join(current_step))
                        current_step = []
                # Check to see if a sentence was left unterminated, and if so, include it
                if current_step:
                    recipe["directions"].append("".join(current_step))
        if current_ingredient:
            if current_recipe_component:
                current_ingredient["component"] = current_recipe_component
            recipe["ingredients"].append(current_ingredient)
    return recipe

