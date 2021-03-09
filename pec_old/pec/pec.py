import os
import time
import signal
import numpy as np
import pandas as pd
import h5py
from pathlib import Path
from multiprocessing import SimpleQueue, Lock
from sklearn.utils import check_random_state

from .utils import SharedArray, TimeManager, best_labels_dtype
from .clustering import ProgressiveKMeansRun, InertiaBased_ProgressiveKMeansRun
from .decision import InertiaBased_ProgressiveDecisionWorker, HGPA_ProgressiveDecisionWorker, MCLA_ProgressiveDecisionWorker
from.metrics import ClusteringMetrics


class ProgressiveEnsembleClustering:
    """Progressive Ensemble Clustering
    
    ----------
    parameters :

        data : ndarray.

        n_clusters : number of clusters.

        n_runs : number of parallel runs to execute.

        alg : algorithm to use, string in {'k-means', 'k-means++'}.

        decision : decision to use, string in {'inertia', 'hgpa', 'mcla'}.

        random_state : seed for random generator.

    """
    def __init__(self, data, n_clusters=2, n_runs=4, alg="k-means", decision="inertia", random_state=None, verbose=False, output_folder=None, callback=None):
        self.data = data
        self.n_clusters = n_clusters
        self.n_runs = n_runs
        self.alg = self.__check_alg_type(alg)
        self.decision = self.__check_decision_type(decision)
        self.random_state = random_state
        self.verbose = verbose
        self.output_folder = Path(output_folder) if output_folder is not None else None
        self.callback = callback

        self.result = None

        self.__active = False
        self.__start_time = None
        self.__time_manager = None
        self.__data_shm, self.__data_sh_obj = SharedArray.create(self.data)
        self.__partitions_shm, self.__partitions_sh_obj = SharedArray.create(
            np.full((self.n_runs, self.data.shape[0]), 0, dtype=best_labels_dtype(self.n_clusters))
        )

        self.__random_state_arr = check_random_state(self.random_state).randint(np.iinfo(np.int32).max, size=self.n_runs)
        self.__clustering_run_arr = None
        self.__decision_worker = None
        self.__clustering_runs_results_queue_arr = [SimpleQueue() for _ in range(self.n_runs)]
        self.__clustering_runs_ack_queue_arr = [SimpleQueue() for _ in range(self.n_runs)]
        self.__clustering_runs_lock_arr = [Lock() for _ in range(self.n_runs)]
        self.__partial_results_queue = SimpleQueue()

        self.__result_csv = None
        self.__result_hdf5 = None
        self.__result_hdf5_labels = None
        self.__partial_results_info_arr = None

    def __check_alg_type(self, alg):
        if alg == "k-means": return alg
        elif alg == "k-means++": return alg
        else: raise RuntimeError(f"Invalid alg type '{alg}'.")

    def __check_decision_type(self, decision):
        if decision == "inertia": return decision
        elif decision == "hgpa": return decision
        elif decision == "mcla": return decision
        else: raise RuntimeError(f"Invalid decision type '{decision}'.")
    
    def __new_InertiaBased_ProgressiveDecisionWorker(self):
        return InertiaBased_ProgressiveDecisionWorker(
            self.__data_sh_obj, self.__partitions_sh_obj, self.n_clusters, self.__partial_results_queue, 
            self.__clustering_runs_results_queue_arr, self.__clustering_runs_ack_queue_arr, self.__clustering_runs_lock_arr,
            start_time=self.__start_time, verbose=self.verbose
        )
    
    def __new_HGPA_ProgressiveDecisionWorker(self):
        return HGPA_ProgressiveDecisionWorker(
            self.__data_sh_obj, self.__partitions_sh_obj, self.n_clusters, self.__partial_results_queue, 
            self.__clustering_runs_results_queue_arr, self.__clustering_runs_ack_queue_arr, self.__clustering_runs_lock_arr,
            start_time=self.__start_time, verbose=self.verbose
        )

    def __new_MCLA_ProgressiveDecisionWorker(self):
        return MCLA_ProgressiveDecisionWorker(
            self.__data_sh_obj, self.__partitions_sh_obj, self.n_clusters, self.__partial_results_queue, 
            self.__clustering_runs_results_queue_arr, self.__clustering_runs_ack_queue_arr, self.__clustering_runs_lock_arr,
            start_time=self.__start_time, verbose=self.verbose
        )
    
    def __new_arr_InertiaBased_ProgressiveKMeansRun(self, alg, **kwargs):
        arr = []
        for i in range(self.n_runs):
            arr.append(InertiaBased_ProgressiveKMeansRun(i, self.__data_sh_obj, self.__partitions_sh_obj, self.n_clusters,
                self.__clustering_runs_results_queue_arr[i], self.__clustering_runs_ack_queue_arr[i], self.__clustering_runs_lock_arr[i], 
                alg=alg, start_time=self.__start_time, random_state=self.__random_state_arr[i], verbose=self.verbose, **kwargs)
            )
        return arr
    
    def __new_arr_ProgressiveKMeansRun(self, alg, **kwargs):
        arr = []
        for i in range(self.n_runs):
            arr.append(ProgressiveKMeansRun(i, self.__data_sh_obj, self.__partitions_sh_obj, self.n_clusters,
                self.__clustering_runs_results_queue_arr[i], self.__clustering_runs_ack_queue_arr[i], self.__clustering_runs_lock_arr[i], 
                alg=alg, start_time=self.__start_time, random_state=self.__random_state_arr[i], verbose=self.verbose, **kwargs)
            )
        return arr
    
    def __save_partial_result(self, partial_result):
        """ Save partial_result on file, if self.output_folder is not None """
        if self.output_folder is not None:
            if self.__result_csv is None and self.__result_hdf5 is None:
                self.__partial_results_info_arr = [partial_result.info]
                self.__result_csv = self.output_folder.joinpath("results.csv")
                
                if self.output_folder.joinpath("results.hdf5").exists(): os.remove(self.output_folder.joinpath("results.hdf5"))
                self.__result_hdf5 = h5py.File(self.output_folder.joinpath("results.hdf5"), "a")
                self.__result_hdf5_labels = self.__result_hdf5.create_dataset(
                    "labels", (1, self.data.shape[0]), maxshape=(None, self.data.shape[0]), 
                    dtype=best_labels_dtype(self.n_clusters), chunks=True)
                self.__result_hdf5_labels[0,:] = partial_result.labels
                
            else:
                self.__partial_results_info_arr.append(partial_result.info)
                self.__result_hdf5_labels.resize((len(self.__partial_results_info_arr), self.data.shape[0]))
                self.__result_hdf5_labels[-1,:] = partial_result.labels
                
            if partial_result.info.is_last:
                fn_calinsky = lambda labels, data: ClusteringMetrics.calinsky_harabaz_score(data, labels)
                fn_dbindex = lambda labels, data: ClusteringMetrics.davies_bouldin_index(data, labels)
                fn_dunnindex = lambda labels, data: ClusteringMetrics.dunn_index(data, labels)

                final_ars_arr = np.apply_along_axis(ClusteringMetrics.adjusted_rand_score, 1, self.__result_hdf5_labels, partial_result.labels)
                final_ami_arr = np.apply_along_axis(ClusteringMetrics.adjusted_mutual_info_score, 1, self.__result_hdf5_labels, partial_result.labels)
                calinsky_arr = np.apply_along_axis(fn_calinsky, 1, self.__result_hdf5_labels, self.data)
                dbindex_arr = np.apply_along_axis(fn_dbindex, 1, self.__result_hdf5_labels, self.data)
                dunnindex_arr = np.apply_along_axis(fn_dunnindex, 1, self.__result_hdf5_labels, self.data)
                
                df = pd.DataFrame(self.__partial_results_info_arr)
                df.insert(1, "alg", self.alg)
                df.insert(1, "decision", self.decision)
                df.insert(len(df.columns), "final_ars", final_ars_arr)
                df.insert(len(df.columns), "final_ami", final_ami_arr)
                df.insert(len(df.columns), "calinsky_harabaz", calinsky_arr)
                df.insert(len(df.columns), "db_index", dbindex_arr)
                df.insert(len(df.columns), "dunn_index", dunnindex_arr)
                df.to_csv(self.__result_csv, index=False)
                
                for cname in df.columns:
                    arr = df[cname].to_numpy()
                    self.__result_hdf5.create_dataset(cname, data=arr)
                
                self.__result_hdf5.flush()
                self.__result_hdf5.close()
        

    def __manage_ctrlC(self, *args):
        """ Manage Ctrl_C keyboard event """
        self.__clean()
        print(f"[{self.__class__.__name__}] Recieved Ctrl_C keyboard event.")
    
    def __clean(self):
        """ Close shared resources """
        if self.__decision_worker is not None: self.__decision_worker.kill()
        if self.__clustering_run_arr is not None: 
            for cr in self.__clustering_run_arr: cr.kill()

        self.__clustering_runs_results_queue_arr = None
        self.__clustering_runs_ack_queue_arr = None
        self.__clustering_runs_lock_arr = None
        self.__partial_results_queue = None
        
        self.__data_shm.close()
        self.__data_shm.unlink()
        self.__partitions_shm.close()
        self.__partitions_shm.unlink()

    def start(self):
        self.__active = True
        self.__start_time = time.time()
        self.__time_manager = TimeManager(self.__start_time)
        self.__exec()
    
    def stop(self):
        self.__active = False

    def on_partial_result(self, result):
        if self.callback is not None:
            self.callback(result)

    def on_end(self):
        pass

    def __exec(self):
        ###
        ### instantiate workers
        ###
        if self.alg=="k-means" and self.decision=="inertia":
            self.__decision_worker = self.__new_InertiaBased_ProgressiveDecisionWorker()
            self.__clustering_run_arr = self.__new_arr_InertiaBased_ProgressiveKMeansRun(self.alg)
        elif self.alg=="k-means++" and self.decision=="inertia":
            self.__decision_worker = self.__new_InertiaBased_ProgressiveDecisionWorker()
            self.__clustering_run_arr = self.__new_arr_InertiaBased_ProgressiveKMeansRun(self.alg)
        elif self.alg=="k-means" and self.decision=="hgpa":
            self.__decision_worker = self.__new_HGPA_ProgressiveDecisionWorker()
            self.__clustering_run_arr = self.__new_arr_ProgressiveKMeansRun(self.alg)
        elif self.alg=="k-means++" and self.decision=="hgpa":
            self.__decision_worker = self.__new_HGPA_ProgressiveDecisionWorker()
            self.__clustering_run_arr = self.__new_arr_ProgressiveKMeansRun(self.alg)
        elif self.alg=="k-means" and self.decision=="mcla":
            self.__decision_worker = self.__new_MCLA_ProgressiveDecisionWorker()
            self.__clustering_run_arr = self.__new_arr_ProgressiveKMeansRun(self.alg)
        elif self.alg=="k-means++" and self.decision=="mcla":
            self.__decision_worker = self.__new_MCLA_ProgressiveDecisionWorker()
            self.__clustering_run_arr = self.__new_arr_ProgressiveKMeansRun(self.alg)
        else:
            raise RuntimeError(f"Not yet implemented alg-decision pair: '{self.alg} -- {self.decision}'.")

        ###
        ### start workers
        ###
        self.__decision_worker.start()
        for cr in self.__clustering_run_arr: cr.start()
        signal.signal(signal.SIGINT, self.__manage_ctrlC) # Manage Ctrl_C keyboard event 
        ### waiting for partial results
        while self.__active:
            self.result = self.__partial_results_queue.get()
            self.result.info.timestamp = self.__time_manager.timestamp(round_digits=4) 
            self.__active = not self.result.info.is_last
            # pause the time manager. the time used by on_partial_result is out of timestamp count
            self.__time_manager.pause()
            self.__save_partial_result(self.result)
            self.on_partial_result(self.result)
            self.__time_manager.resume()
        ###
        ### process completed
        ###
        self.on_end()
        self.__clean()
        if self.verbose: print(f"[{self.__class__.__name__}] terminated.")


class InertiaBased_ProgressiveEnsembleKmeans(ProgressiveEnsembleClustering):
    """ Inertia Based Progressive Ensemble Kmeans """
    def __init__(self, data, n_clusters=2, n_runs=4, random_state=None, output_folder=None, verbose=False, callback=None):
        super().__init__(data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means", decision="inertia", random_state=random_state, output_folder=output_folder,
            verbose=verbose, callback=callback
        )
     
class InertiaBased_ProgressiveEnsembleKmeansPP(ProgressiveEnsembleClustering):
    """ Inertia Based Progressive Ensemble Kmeans++ """
    def __init__(self, data, n_clusters=2, n_runs=4, random_state=None, output_folder=None, verbose=False, callback=None):
        super().__init__(data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means++", decision="inertia", random_state=random_state, output_folder=output_folder,
            verbose=verbose, callback=callback
        )

class HGPA_ProgressiveEnsembleKmeans(ProgressiveEnsembleClustering):
    """ HGPA Progressive Ensemble Kmeans """
    def __init__(self, data, n_clusters=2, n_runs=4, random_state=None, output_folder=None, verbose=False, callback=None):
        super().__init__(data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means", decision="hgpa", random_state=random_state, output_folder=output_folder,
            verbose=verbose, callback=callback
        )

class HGPA_ProgressiveEnsembleKmeansPP(ProgressiveEnsembleClustering):
    """ HGPA Progressive Ensemble Kmeans++ """
    def __init__(self, data, n_clusters=2, n_runs=4, random_state=None, output_folder=None, verbose=False, callback=None):
        super().__init__(data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means++", decision="hgpa", random_state=random_state, output_folder=output_folder,
            verbose=verbose, callback=callback
        )

class MCLA_ProgressiveEnsembleKmeans(ProgressiveEnsembleClustering):
    """ MCLA Progressive Ensemble Kmeans """
    def __init__(self, data, n_clusters=2, n_runs=4, random_state=None, output_folder=None, verbose=False, callback=None):
        super().__init__(data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means", decision="mcla", random_state=random_state, output_folder=output_folder,
            verbose=verbose, callback=callback
        )

class MCLA_ProgressiveEnsembleKmeansPP(ProgressiveEnsembleClustering):
    """ MCLA Progressive Ensemble Kmeans++ """
    def __init__(self, data, n_clusters=2, n_runs=4, random_state=None, output_folder=None, verbose=False, callback=None):
        super().__init__(data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means++", decision="mcla", random_state=random_state, output_folder=output_folder,
            verbose=verbose, callback=callback
        )