import os.path
import re
import pandas
from pint import UnitRegistry, UndefinedUnitError
from metarecipe import models
from metarecipe.app import app, db

ignored_food_groups = {
    300,  # Baby Foods
    2100,  # Fast Foods
    2200,  # Meals, Entrees, and Side Dishes
    2500,  # Snacks
    3500,  # American Indian/Alaska Native Foods
    3600  # Restaurant Foods
}

nutrient_display_names = {
    211: "Glucose",
    221: "Alcohol",
    291: "Fiber",
    301: "Calcium",
    303: "Iron",
    304: "Magnesium",
    305: "Phosphorus",
    306: "Potassium",
    307: "Sodium",
    309: "Zinc",
    312: "Copper",
    313: "Fluoride",
    315: "Manganese",
    317: "Selenium",
    318: "Vitamin A",
    320: "Vitamin A",
    321: "Beta-carotene",
    322: "Alpha-carotene",
    323: "Vitamin E",
    325: "Vitamin D2",
    326: "Vitamin D3",
    334: "Beta-cryptoxanthin",
    341: "Beta-tocopherol",
    342: "Gamma-tocopherol",
    343: "Delta-tocopherol",
    344: "Alpha-tocotrienol",
    345: "Beta-tocotrienol",
    346: "Gamma-tocotrienol",
    347: "Delta-tocotrienol",
    401: "Vitamin C",
    404: "Vitamin B1",
    405: "Vitamin B2",
    406: "Vitamin B3",
    410: "Vitamin B5",
    415: "Vitamin B6",
    417: "Folate",
    418: "Vitamin B12",
    430: "Vitamin K",
    605: "Trans fat",
    606: "Saturated fat",
    645: "Monounsaturated fat",
    646: "Polyunsaturated fat",
    607: "Butyric acid",
    608: "Caprioc acid",
    609: "Caprylic acid",
    610: "Capric acid",
    611: "Lauric acid",
    696: "Tridecylic acid",
    612: "Myristic acid",
    652: "Pentadecylic acid",
    613: "Palmitic acid",
    653: "Margaric acid",
    614: "Stearic acid",
    615: "Arachidic acid",
    624: "Behenic acid",
    654: "Lignoceric acid",
    625: "Myristoleic acid",
    697: "C15:1",
    626: "Palmitoleic acid",  # Undifferentiated
    673: "Palmitoleic acid",
    687: "C17:1",
    617: "Oleic acid",  # Undifferentiated
    674: "Oleic acid",
    628: "Galoleic acid",
    630: "Erucic acid",  # Undifferentiated
    676: "Erucic acid",
    671: "Nervonic acid",
    618: "Linoleic acid",  # Undifferentiated
    675: "Linoleic acid",
    619: "Linolenic acid",
    851: "Alpha-linolenic acid",
    685: "Gamma-linolenic acid",
    627: "Parinaric acid",
    855: "Arachidonic acid",
    629: "EPA",
    631: "Clupanodonic acid",
    621: "DHA"
}

nutrient_scientific_names = {
    221: "Ethanol",
    323: "Alpha-tocopherol",
    325: "Ergocalciferol",
    326: "Cholecalicferol",
    401: "Ascorbic acid",
    404: "Thiamine",
    405: "Riboflavin",
    406: "Niacin",
    410: "Pantothenic acid",
    415: "Pyridoxine",
    418: "Cobalamine",
    430: "Phylloquinone",
    629: "Eicosapentanoic acid",
    621: "Docosahexaenoic acid"
}

nutrient_rdi = {
    319: 900,  # Retinol
    320: 900,  # Vitamin A
    321: 900,  # Beta carotene
    322: 900,  # Alpha carotene
    401: 60,  # Vitamin C
    301: 1000,  # Calcium
    303: 18,  # Iron
    324: 400,  # Vitamin D
    325: 10,  # Vitamin D2
    326: 10,  # Vitamin D3
    328: 10,  # Vitamin D2/D3
    323: 15,  # Vitamin E
    341: 15,  # Beta tocopherol
    342: 15,  # Gamma tocopherol
    343: 15,  # Delta tocopherol
    344: 15,  # Alpha tocotrienol
    345: 15,  # Beta tocotrienol
    346: 15,  # Gamma tocotrienol
    347: 15,  # Delta tocotrienol
    430: 80,  # Vitamin K
    404: 1.5,  # Vitamin B1
    405: 1.7,  # Vitamin B2
    406: 20,  # Vitamin B3
    415: 2,  # Vitamin B6
    417: 400,  # Folate
    418: 6,  # Vitamin B12
    #: 300,  # Biotin
    410: 10,  # Vitamin B5
    305: 1000,  # Phosphorus
    #: 150,  # Iodine
    304: 400,  # Magnesium
    309: 15,  # Zinc
    317: 70,  # Selenium
    312: 2000,  # Copper
    315: 2  # Manganese
    #: 120,  # Chromium
    #: 75,  # Molybdenum
    #: 34000,  # Chloride
}

display_nutrient = {

}

food_description_columns = ("ndb_id", "food_group", "description", "short_description", "common_name", "manufacturer",
                            "survey", "refuse_description", "percentage_refuse", "scientific_name", "n_factor",
                            "pro_factor", "fat_factor", "cho_factor")

nutrition_data_columns = ("ndb_id", "nutrient_id", "nutrient_value", "data_points", "std_err", "source_code",
                          "derivation_code", "reference_ndb_id", "added_nutrient", "studies", "min", "max",
                          "degrees_of_freedom", "lower_bound", "upper_bound", "comment", "modification_date",
                          "confidence_code")

nutrient_definition_columns = ("nutrient_id", "units", "tag_name", "description", "precision", "sort_order")

weight_data_columns = ("ndb_id", "sequence", "amount", "measure_description", "gram_weight", "data_points",
                       "std_dev")


def main(data_dir):
    ureg = UnitRegistry()
    food_description_file = os.path.join(data_dir, "FOOD_DES.txt")
    nutrient_definition_file = os.path.join(data_dir, "NUTR_DEF.txt")
    nutrition_data_file = os.path.join(data_dir, "NUT_DATA.txt")
    weight_data_file = os.path.join(data_dir, "WEIGHT.txt")

    food_descriptions = pandas.read_csv(food_description_file, quotechar='~', delimiter='^', encoding='latin-1',
                                        header=None, names=food_description_columns)
    nutrient_definitions = pandas.read_csv(nutrient_definition_file, quotechar='~', delimiter='^', encoding='latin-1',
                                           header=None, names=nutrient_definition_columns)
    nutrition_data = pandas.read_csv(nutrition_data_file, quotechar='~', delimiter='^', encoding='latin-1', header=None,
                                     names=nutrition_data_columns)
    weight_data = pandas.read_csv(weight_data_file, quotechar='~', delimiter='^', encoding='latin-1', header=None,
                                  names=weight_data_columns)

    # Pandas is retarded when it comes to handling text in csv files...
    food_descriptions.fillna('', inplace=True)
    nutrient_definitions.fillna('', inplace=True)
    nutrition_data.fillna('', inplace=True)
    weight_data.fillna('', inplace=True)

    with app.test_request_context():
        ingredients = {}
        ingredient_preparations = []
        nutrients = {}
        ingredient_nutrients = []

        for entry in food_descriptions.itertuples():
            if entry.food_group in ignored_food_groups:
                continue
            ingredient = models.Ingredient(ingredient_id=int(entry.ndb_id))
            ingredients[entry.ndb_id] = ingredient
            ingredient.names.append(models.IngredientName(name=entry.description, canonical=True))

        for entry in nutrient_definitions.itertuples():
            nutrient_id = int(entry.nutrient_id)
            display_name = nutrient_display_names.get(nutrient_id)
            scientific_name = nutrient_scientific_names.get(nutrient_id)
            recommended_daily_intake = nutrient_rdi.get(nutrient_id)
            display = display_nutrient.get(nutrient_id, False)
            nutrient = models.Nutrient(nutrient_id=nutrient_id, display_name=display_name,
                                       scientific_name=scientific_name, measurement_unit=entry.units,
                                       recommended_daily_intake=recommended_daily_intake, display=display)
            nutrients[nutrient_id] = nutrient

        # Most entries in the weights file conform to this pattern
        weight_re = re.compile(r"([\w\s]+?)(?:\s+\(.*\))?(?:,\s+(.*))?\Z")
        for weight_entry in weight_data.itertuples():
            if weight_entry.ndb_id not in ingredients:
                continue
            # Pint thinks fl oz is femtolitre ounces
            if weight_entry.measure_description == "fl oz":
                description = "fluid ounces"
                # US regulation defines a fluid ounce as equivalent to 30mL for nutrition labeling purposes
                volume = weight_entry.amount * ureg.parse_expression("30 ml").to_base_units()
                # Convert the gram weight to kilograms so density is in standard units
                mass = weight_entry.gram_weight / 1000 * ureg.kilogram
                density = float((mass / volume).magnitude)
            # Special case, as pat matches a unit, but in this context should not be interpreted as such
            elif weight_entry.measure_description.startswith("pat "):
                description = weight_entry.measure_description
                density = None
            else:
                match = weight_re.match(weight_entry.measure_description)
                if match:
                    (unit_name, preparation) = match.groups()
                    # First determine that this weight contains units rather than something nebulous like a "serving"
                    try:
                        quantity = weight_entry.amount * ureg.parse_expression(unit_name)
                        description = preparation
                        # Convert to base units so volume measurements are in cubic meters
                        volume = quantity.to_base_units()
                        # Discard entries with non-volume measurements
                        if not volume.units.get("meter") == 3:
                            continue
                        # Convert the gram weight to kilograms so density is in standard units
                        mass = weight_entry.gram_weight / 1000 * ureg.kilogram
                        density = float((mass / volume).magnitude)
                    except UndefinedUnitError:
                        description = weight_entry.measure_description
                        density = None
                else:
                    description = weight_entry.measure_description
                    density = None
            ingredient_preparation = models.IngredientMeasure(ingredient_id=int(weight_entry.ndb_id),
                                                              description=description, density=density,
                                                              amount=float(weight_entry.amount),
                                                              weight=float(weight_entry.gram_weight))
            ingredient_preparations.append(ingredient_preparation)

        for entry in nutrition_data.itertuples():
            if entry.ndb_id not in ingredients:
                continue
            ingredient_nutrient = models.IngredientNutrient(nutrient_id=int(entry.nutrient_id),
                                                            ingredient_id=int(entry.ndb_id),
                                                            quantity=float(entry.nutrient_value))
            ingredient_nutrients.append(ingredient_nutrient)
        db.session.add_all(ingredients.values())
        db.session.add_all(nutrients.values())
        db.session.commit()

        db.session.add_all(ingredient_preparations)
        db.session.add_all(ingredient_nutrients)
        db.session.commit()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir")
    args = parser.parse_args()
    main(args.data_dir)
