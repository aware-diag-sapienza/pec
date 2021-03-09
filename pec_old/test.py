import argparse
from pathlib import Path
import pandas as pd
import numpy as np
import time

from pec import InertiaBased_ProgressiveEnsembleKmeans, InertiaBased_ProgressiveEnsembleKmeansPP
from pec import HGPA_ProgressiveEnsembleKmeans, HGPA_ProgressiveEnsembleKmeansPP
from pec import MCLA_ProgressiveEnsembleKmeans, MCLA_ProgressiveEnsembleKmeansPP


class PEC_Demo(HGPA_ProgressiveEnsembleKmeans):
    def __init__(self, data, output_folder, **kwargs):
        kwargs["output_folder"]=output_folder
        super().__init__(data, **kwargs)
        
    def on_partial_result(self, result):
        print(result.info)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-r", "--runs", default=8, help="number of parallel runs, default 8")
    args = parser.parse_args()

    folder_arr = [Path("pec/datasets/real"), Path("pec/datasets/benchmark")]
    data_folder_arr = [folder.joinpath("data") for folder in folder_arr]

    r = int(args.runs)
    
    output_folder_arr = [f.joinpath(f"results-r{str(r).zfill(2)}") for f in folder_arr]
    for f in output_folder_arr: f.mkdir(exist_ok=True, parents=True)

    print("Input", folder_arr)

    datasets = []
    for i in range(len(data_folder_arr)):
        for f in data_folder_arr[i].glob("*.csv"):
            dataset_name = f.stem
            if "birch" in dataset_name: continue
            if "dim" in dataset_name: continue
            datasets.append((f, output_folder_arr[i]))


    k_min = 2
    k_max = 50
    for seed in range(10):
        for k in range(k_min, k_max+1):
            for di, dentry in enumerate(datasets):
                dataset_file = dentry[0]
                dataset_output = dentry[1]
                
                dataset_name = dataset_file.stem

                if "birch" in dataset_name: continue
                if "dim" in dataset_name: continue

                start_time = time.time()

                print(f"Loading dataset {dataset_name}")
                data = np.loadtxt(dataset_file, delimiter=",", skiprows=1, dtype=float)
                print("Starting")
                if k >= data.shape[0]: continue

                def callback_fn(result):
                    print(f"\033[92m{di}#{dataset_name}\033[0m", f"\033[93mseed={seed} k={k}\033[0m", f"timestamp={result.info['timestamp']} iteration={result.info['iteration']}")
                
                dest = dataset_output.joinpath(f"k-{str(k).zfill(2)}", f"seed-{str(seed).zfill(2)}", f"inertia-kmeans")
                dest.mkdir(exist_ok=True, parents=True)
                results_folder_alg = dest.joinpath(f"{dataset_name}____k{k}-r{r}-s{seed}-inertia-kmeans")
                results_folder_alg.mkdir(exist_ok=True, parents=True)
                InertiaBased_ProgressiveEnsembleKmeans(data, n_clusters=k, n_runs=r, random_state=seed, output_folder=results_folder_alg, callback=callback_fn).start()
                
                dest = dataset_output.joinpath(f"k-{str(k).zfill(2)}", f"seed-{str(seed).zfill(2)}", f"inertia-kmeans++")
                dest.mkdir(exist_ok=True, parents=True)
                results_folder_alg = dest.joinpath(f"{dataset_name}____k{k}-r{r}-s{seed}-inertia-kmeans++")
                results_folder_alg.mkdir(exist_ok=True, parents=True)
                InertiaBased_ProgressiveEnsembleKmeansPP(data, n_clusters=k, n_runs=r, random_state=seed, output_folder=results_folder_alg, callback=callback_fn).start()
                
                '''
                dest = dataset_output.joinpath(f"k-{str(k).zfill(2)}", f"seed-{str(seed).zfill(2)}", f"hgpa-kmeans")
                dest.mkdir(exist_ok=True, parents=True)
                results_folder_alg = dest.joinpath(f"{dataset_name}____k{k}-r{r}-s{seed}-hgpa-kmeans")
                results_folder_alg.mkdir(exist_ok=True, parents=True)
                HGPA_ProgressiveEnsembleKmeans(data, n_clusters=k, n_runs=r, random_state=seed, output_folder=results_folder_alg, callback=callback_fn).start()
                    
                dest = dataset_output.joinpath(f"k-{str(k).zfill(2)}", f"seed-{str(seed).zfill(2)}", f"hgpa-kmeans++")
                dest.mkdir(exist_ok=True, parents=True)
                results_folder_alg = dest.joinpath(f"{dataset_name}____k{k}-r{r}-s{seed}-hgpa-kmeans++")
                results_folder_alg.mkdir(exist_ok=True, parents=True)
                HGPA_ProgressiveEnsembleKmeansPP(data, n_clusters=k, n_runs=r, random_state=seed, output_folder=results_folder_alg, callback=callback_fn).start()
                
                
                
                dest = dataset_output.joinpath(f"k-{str(k).zfill(2)}", f"seed-{str(seed).zfill(2)}", f"mcla-kmeans")
                dest.mkdir(exist_ok=True, parents=True)
                results_folder_alg = dest.joinpath(f"{dataset_name}____k{k}-r{r}-s{seed}-mcla-kmeans")
                results_folder_alg.mkdir(exist_ok=True, parents=True)
                MCLA_ProgressiveEnsembleKmeans(data, n_clusters=k, n_runs=r, random_state=seed, output_folder=results_folder_alg, callback=callback_fn).start()
                    
                dest = dataset_output.joinpath(f"k-{str(k).zfill(2)}", f"seed-{str(seed).zfill(2)}", f"mcla-kmeans++")
                dest.mkdir(exist_ok=True, parents=True)
                results_folder_alg = dest.joinpath(f"{dataset_name}____k{k}-r{r}-s{seed}-mcla-kmeans++")
                results_folder_alg.mkdir(exist_ok=True, parents=True)
                MCLA_ProgressiveEnsembleKmeansPP(data, n_clusters=k, n_runs=r, random_state=seed, output_folder=results_folder_alg, callback=callback_fn).start()
                '''

                print(f"\nDone seed={seed} k={k} dataset={dataset_name}   ----    {round((time.time()-start_time)/60, 2)}min\n") 

          