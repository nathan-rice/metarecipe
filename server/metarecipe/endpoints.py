from flask import Blueprint, request, jsonify, abort

from . import search
from . import models
from . import extractors

recipe_search = Blueprint('recipe_search', __name__)

crud = Blueprint('crud', __name__)


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


@crud.route('/recipe_document/<int:document_id>/tags/')
def get_recipe_document_word_tags(document_id):
    tags = models.RecipeDocumentWordTag.query\
        .join(models.RecipeDocumentTagSet)\
        .filter(models.RecipeDocumentTagSet.recipe_document_id == document_id)\
        .all()
    return jsonify(tags=[tag.as_dict for tag in tags])


@crud.route('/recipe_document/<int:document_id>/tags/', methods=["POST"])
def create_recipe_document_word_tags(document_id):
    tags_json = request.get_json()
    recipe_document_tag_set = models.RecipeDocumentTagSet.query\
        .filter(models.RecipeDocumentTagSet.recipe_document_id == document_id)\
        .first()
    if not recipe_document_tag_set:
        recipe_document_tag_set = models.RecipeDocumentTagSet(recipe_document_id=document_id)
        models.db.session.add(recipe_document_tag_set)
    for tag_dict in tags_json:
        tag = models.RecipeDocumentWordTag(word=tag_dict["recipe_document_word_id"], tag=tag_dict["tag"])
        recipe_document_tag_set.tags.append(tag)
    models.db.session.commit()
    return jsonify(tags=[tag.as_dict for tag in recipe_document_tag_set.tags])


@crud.route('/recipe_document/<int:document_id>/tags/', methods=["DELETE"])
def delete_recipe_document_word_tag(document_id):
    tag_ids = request.get_json()
    deleted = models.RecipeDocumentWordTag.query\
        .filter(models.RecipeDocumentWordTag.recipe_document_word_tag_id.in_(tag_ids))\
        .delete()
    if not deleted:
        return abort(404)
    else:
        return jsonify(deleted=deleted)

