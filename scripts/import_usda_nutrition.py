import os.path
import pandas



def main(data_dir):
    nutrient_definition_file = os.path.join(data_dir, "NUTR_DEF.txt")
    nutrition_data_file = os.path.join(data_dir, "NUT_DATA.txt")
    nutrient_definitions = pandas.read_csv(nutrient_definition_file, quotechar='~', delimiter='^', encoding='latin-1')


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir")
    args = parser.parse_args()
    main(args.data_dir)
