import argparse
from pathlib import Path
import os

SEED = 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="input folder")
    parser.add_argument("-o", "--output", default="data", help="output folder")
    args = parser.parse_args()

    inputFolder = Path(args.input)
    outputFolder = Path(args.output)
    outputFolder.mkdir(exist_ok=True, parents=True)

    dataset_out_folder = {}

    for csv in inputFolder.joinpath("data").glob("*.csv"):
        dataset_name = csv.stem
        out = outputFolder.joinpath(dataset_name)
        out.mkdir(exist_ok=True, parents=True)
        dataset_out_folder[dataset_name] = out

        out_csv = out.joinpath(f"{dataset_name}.csv")     
        os.system(f"cp {csv.resolve()} {out_csv.resolve()}")
        print(out_csv.name)

    for res_fold in inputFolder.glob("*"):
        if not res_fold.is_dir(): continue
        if not res_fold.stem.startswith("results-r"): continue
        r = res_fold.stem.split("#")[0]
        __R__ = int(r.replace("results-r", ""))
        #print(__R__)
        
        for k_fold in res_fold.glob("*"):
            if not k_fold.is_dir(): continue
            if not k_fold.stem.startswith("k-"): continue
            __K__ = int(k_fold.stem.replace("k-", ""))

            for seed_fold in k_fold.glob("*"):
                if not seed_fold.is_dir(): continue
                __S__ = int(seed_fold.stem.replace("seed-", ""))
                if __S__ != SEED: continue

                for tech_fold in seed_fold.glob("*"):
                    if not tech_fold.is_dir(): continue
                    __T__ = tech_fold.stem

                    for dataset_fold in tech_fold.glob("*"):
                        if not dataset_fold.is_dir(): continue
                        __D__ = dataset_fold.stem.split("____")[0]

                        out = dataset_out_folder[__D__].joinpath(f"{__T__}", f"k{__K__}", f"r{__R__}")
                        out.mkdir(exist_ok=True, parents=True)

                        input_hdf5 = dataset_fold.joinpath("results.hdf5")
                        out_hdf5 = out.joinpath(f"{__D__}__t{__T__}__k{__K__}__r{__R__}.hdf5")
                        if out_hdf5.exists(): os.system(f"rm {out_hdf5.resolve()}")
                        os.system(f"cp {input_hdf5.resolve()} {out_hdf5.resolve()}")
                        print(out_hdf5.resolve())



