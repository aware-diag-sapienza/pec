import os
import time
import signal
import traceback
import numpy as np
import pandas as pd
import h5py
import uuid
from pathlib import Path
from multiprocessing import SimpleQueue, Lock

from sklearn.utils import Bunch, check_random_state

from .utils import SharedArray, TimeManager, best_labels_dtype, ProgressiveResultMetrics
from .clustering import ProgressiveKMeansRun, InertiaBased_ProgressiveKMeansRun
from .decision import InertiaBased_ProgressiveDecisionWorker#, HGPA_ProgressiveDecisionWorker, MCLA_ProgressiveDecisionWorker
from .metrics import ClusteringMetrics


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

        results_parent_folder: create a folder inside with name equal to jobid and save results here.

        results_folder: if not none, save results here overriding results_parent_folder settings.

    """
    def __init__(self, data, n_clusters=2, n_runs=4, alg="k-means", decision="inertia", random_state=None, job_id=None, verbose=False, 
    results_parent_folder=None, results_folder=None, results_callback=None, instance=None):
        self.data = data
        self.n_entries = data.shape[0]
        self.n_clusters = n_clusters
        self.n_runs = n_runs
        self.alg = self.__check_alg_type(alg)
        self.decision = self.__check_decision_type(decision)
        self.instance = instance if instance is not None else f"{self.alg}.{self.decision}"
        self.random_state = random_state
        self.verbose = verbose
        self.job_id = job_id if job_id is not None else str(uuid.uuid4())
        self.results_callback = results_callback
        self.__resultsFileWriter = ResultsFileWriter(self.job_id, results_parent_folder, results_folder,
            self.n_entries, self.n_clusters, self.n_runs, self.instance)

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
        
        
        self.__prevResult = None #previous partial result
        self.__metricsHistory = []
        self.__labelsHistory = []
        self.__partitionsHistory = []
        '''
        self.__result_csv = None
        self.__result_hdf5 = None
        self.__result_hdf5_labels = None
        self.__partial_results_info_arr = None
        '''

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
        pass
        ## uncomment if using mcla-hgpa
        '''
        return HGPA_ProgressiveDecisionWorker(
            self.__data_sh_obj, self.__partitions_sh_obj, self.n_clusters, self.__partial_results_queue, 
            self.__clustering_runs_results_queue_arr, self.__clustering_runs_ack_queue_arr, self.__clustering_runs_lock_arr,
            start_time=self.__start_time, verbose=self.verbose
        )
        '''

    def __new_MCLA_ProgressiveDecisionWorker(self):
        pass
        ## uncomment if using mcla-hgpa
        '''
        return MCLA_ProgressiveDecisionWorker(
            self.__data_sh_obj, self.__partitions_sh_obj, self.n_clusters, self.__partial_results_queue, 
            self.__clustering_runs_results_queue_arr, self.__clustering_runs_ack_queue_arr, self.__clustering_runs_lock_arr,
            start_time=self.__start_time, verbose=self.verbose
        )
        '''
    
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
        print(partial_result.partitions)
        return
        """ Save partial_result on file, if self.results_folder is not None """
        if self.results_folder is not None:
            if self.__result_csv is None and self.__result_hdf5 is None:
                self.__partial_results_info_arr = [partial_result.info]
                self.__result_csv = self.results_folder.joinpath("results.csv")
                
                if self.results_folder.joinpath("results.hdf5").exists(): os.remove(self.results_folder.joinpath("results.hdf5"))
                self.__result_hdf5 = h5py.File(self.results_folder.joinpath("results.hdf5"), "a")
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
        if self.results_callback is not None:
            self.results_callback(result)

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
        try:
            signal.signal(signal.SIGINT, self.__manage_ctrlC) # Manage Ctrl_C keyboard event
        except ValueError as e:
            pass
        ### waiting for partial results
        while self.__active:
            result = self.__partial_results_queue.get()
            result.job_id = self.job_id
            result.info.timestamp = self.__time_manager.timestamp(round_digits=4) #update timestamp of result. original timestamp is when the result was generated, but some delay can appear when is recieved here
            self.__active = not result.info.is_last
            try:
                result = self.__computeResultMetrics(result, self.__prevResult, self.__metricsHistory, self.__labelsHistory, self.__partitionsHistory)
            except:
                traceback.print_exc()
                exit()
            # pause the time manager. the time used by on_partial_result is out of timestamp count
            self.__time_manager.pause()
            self.__resultsFileWriter.save(result)
            
            self.__prevResult = result
            self.__metricsHistory.append(result.metrics)
            self.__labelsHistory.append(result.labels)
            self.__partitionsHistory.append(result.partitions)

            
            self.on_partial_result(result)
            self.__time_manager.resume()
        ###
        ### process completed
        ###
        self.__resultsFileWriter.close()
        self.on_end()
        self.__clean()
        if self.verbose: print(f"[{self.__class__.__name__}] terminated.")

    def __computeResultMetrics(self, currentResult, prevResult, metricsHistory, labelsHistory, partitionsHistory):
        firstIteration = prevResult is None
        hystoryLen = len(metricsHistory)
        getSinglePartitionHistory = lambda i: [partitionsHistory[j][i] for j in range(hystoryLen)]

        fn_inertia = lambda labels, data: ClusteringMetrics.inertia(data, labels)
        fn_calinsky = lambda labels, data: ClusteringMetrics.calinsky_harabaz_score(data, labels)
        fn_dbindex = lambda labels, data: ClusteringMetrics.davies_bouldin_index(data, labels)
        fn_dunnindex = lambda labels, data: ClusteringMetrics.dunn_index(data, labels)
        fn_ssil = lambda labels, data: ClusteringMetrics.simplified_silhouette(data, labels)

        labelsMetrics = {
            "inertia": ClusteringMetrics.inertia(self.data, currentResult.labels),
            "dbIndex": ClusteringMetrics.davies_bouldin_index(self.data, currentResult.labels),
            "dunnIndex": ClusteringMetrics.dunn_index(self.data, currentResult.labels),
            "calinskyHarabasz": ClusteringMetrics.calinsky_harabaz_score(self.data, currentResult.labels),
            "adjustedRandScore": np.ones(self.n_runs, dtype=float),
            "adjustedMutualInfoScore": np.ones(self.n_runs, dtype=float),
            "simplifiedSilhouette": ClusteringMetrics.simplified_silhouette(self.data, currentResult.labels),
            #"silhouette": ClusteringMetrics.silhouette(self.data, currentResult.labels)
        }
        partitionsMetrics = {
            "inertia": np.apply_along_axis(fn_inertia, 1, currentResult.partitions, self.data),
            "dbIndex": np.apply_along_axis(fn_dbindex, 1, currentResult.partitions, self.data),
            "dunnIndex": np.apply_along_axis(fn_dunnindex, 1, currentResult.partitions, self.data),
            "calinskyHarabasz": np.apply_along_axis(fn_calinsky, 1, currentResult.partitions, self.data),
            "adjustedRandScore": np.ones((self.n_runs, self.n_runs), dtype=float),
            "adjustedMutualInfoScore": np.ones((self.n_runs, self.n_runs), dtype=float),
            "simplifiedSilhouette": np.apply_along_axis(fn_ssil, 1, currentResult.partitions, self.data),

            "averageAdjustedRandScore": np.zeros((self.n_runs, self.n_runs), dtype=float),
            "averageAdjustedMutualInfoScore": np.zeros((self.n_runs, self.n_runs), dtype=float),
        }
        
        for i in range(self.n_runs):
            labelsMetrics["adjustedRandScore"][i] = ClusteringMetrics.adjusted_rand_score(currentResult.partitions[i], currentResult.labels)
            labelsMetrics["adjustedMutualInfoScore"][i] = ClusteringMetrics.adjusted_mutual_info_score(currentResult.partitions[i], currentResult.labels)
            for j in range(self.n_runs):
                partitionsMetrics["adjustedRandScore"][i,j] = ClusteringMetrics.adjusted_rand_score(currentResult.partitions[i], currentResult.partitions[j])
                partitionsMetrics["adjustedMutualInfoScore"][i,j] = ClusteringMetrics.adjusted_mutual_info_score(currentResult.partitions[i], currentResult.partitions[j])

        
        ##compute average of adjustedRandScore and adjustedMutualInfoScore
        if firstIteration:
            for t in range(len(metricsHistory)):
                partitionsMetrics["averageAdjustedRandScore"] = partitionsMetrics["adjustedRandScore"]
                partitionsMetrics["averageAdjustedMutualInfoScore"] = partitionsMetrics["adjustedMutualInfoScore"]
        else:
            for t in range(len(metricsHistory)):
                partitionsMetrics["averageAdjustedRandScore"] += metricsHistory[t].partitionsMetrics["adjustedRandScore"]
                partitionsMetrics["averageAdjustedMutualInfoScore"] += metricsHistory[t].partitionsMetrics["adjustedMutualInfoScore"]
            partitionsMetrics["averageAdjustedRandScore"] /= len(metricsHistory)
            partitionsMetrics["averageAdjustedMutualInfoScore"] /= len(metricsHistory) 

        
        
        def fn_min_labelsMetricHistory(m): return np.min([h.labelsMetrics[m] for h in metricsHistory])
        def fn_max_labelsMetricHistory(m): return np.max([h.labelsMetrics[m] for h in metricsHistory])
        def gradient(m): return progressiveMetrics[m] - metricsHistory[-1].progressiveMetrics[m]
        
        progressiveMetrics = {
           "entriesStability": {
                "2":  0 if firstIteration else ClusteringMetrics.entries_stability(labelsHistory, window=2),
                "3":  0 if firstIteration else ClusteringMetrics.entries_stability(labelsHistory, window=3),
                "4":  0 if firstIteration else ClusteringMetrics.entries_stability(labelsHistory, window=4),
                "5":  0 if firstIteration else ClusteringMetrics.entries_stability(labelsHistory, window=5),
                "10":  0 if firstIteration else ClusteringMetrics.entries_stability(labelsHistory, window=10),
                "all":  0 if firstIteration else ClusteringMetrics.entries_stability(labelsHistory, window=None)
            },
            "globalStability": {
                "2":  0 if firstIteration else ClusteringMetrics.global_stability(labelsHistory, window=2),
                "3":  0 if firstIteration else ClusteringMetrics.global_stability(labelsHistory, window=3),
                "4":  0 if firstIteration else ClusteringMetrics.global_stability(labelsHistory, window=4),
                "5":  0 if firstIteration else ClusteringMetrics.global_stability(labelsHistory, window=5),
                "10":  0 if firstIteration else ClusteringMetrics.global_stability(labelsHistory, window=10),
                "all":  0 if firstIteration else ClusteringMetrics.global_stability(labelsHistory, window=None)
            },

            "partitionsGlobalStability": {
                "2": np.full(self.n_runs, 0, dtype=int) if firstIteration else [ClusteringMetrics.global_stability(getSinglePartitionHistory(i), window=2) for i in range(self.n_runs)],
                "3": np.full(self.n_runs, 0, dtype=int) if firstIteration else [ClusteringMetrics.global_stability(getSinglePartitionHistory(i), window=3) for i in range(self.n_runs)],
                "4": np.full(self.n_runs, 0, dtype=int) if firstIteration else [ClusteringMetrics.global_stability(getSinglePartitionHistory(i), window=4) for i in range(self.n_runs)],
                "5": np.full(self.n_runs, 0, dtype=int) if firstIteration else [ClusteringMetrics.global_stability(getSinglePartitionHistory(i), window=5) for i in range(self.n_runs)],
                "10": np.full(self.n_runs, 0, dtype=int) if firstIteration else [ClusteringMetrics.global_stability(getSinglePartitionHistory(i), window=10) for i in range(self.n_runs)],
                "all": np.full(self.n_runs, 0, dtype=int) if firstIteration else [ClusteringMetrics.global_stability(getSinglePartitionHistory(i), window=None) for i in range(self.n_runs)]
            },

            "inertia_improvement": 0 if firstIteration else (fn_max_labelsMetricHistory("inertia") - labelsMetrics["inertia"]) / fn_max_labelsMetricHistory("inertia"),
            "dbIndex_improvement": 0 if firstIteration else (fn_max_labelsMetricHistory("dbIndex") - labelsMetrics["dbIndex"]) / fn_max_labelsMetricHistory("dbIndex"),
            "dunnIndex_improvement": 0 if firstIteration else (labelsMetrics["dunnIndex"] - fn_min_labelsMetricHistory("dunnIndex")) / fn_min_labelsMetricHistory("dunnIndex"),
            "calinskyHarabasz_improvement": 0 if firstIteration else (labelsMetrics["calinskyHarabasz"] - fn_min_labelsMetricHistory("calinskyHarabasz")) / fn_min_labelsMetricHistory("calinskyHarabasz"),
            
            "adjustedRandScore": 0 if firstIteration else ClusteringMetrics.adjusted_rand_score(currentResult.labels, prevResult.labels),
            "adjustedMutualInfoScore": 0 if firstIteration else ClusteringMetrics.adjusted_mutual_info_score(currentResult.labels, prevResult.labels)
        }
        # compute gradients
        for key in list(progressiveMetrics.keys()):
            if "Stability" in key: continue
            if prevResult is not None: progressiveMetrics[f"{key}Gradient"] = gradient(key)

        
        earlyTermination = Bunch(slow=False, fast=False)
        if not firstIteration:
            if progressiveMetrics["inertia_improvementGradient"] < 1e-4 or prevResult.metrics.earlyTermination.fast:
                earlyTermination.fast = True
            if progressiveMetrics["inertia_improvementGradient"] < 1e-5 or prevResult.metrics.earlyTermination.slow:
                earlyTermination.slow = True
   
   
        currentResult.metrics = ProgressiveResultMetrics(labelsMetrics=labelsMetrics, partitionsMetrics=partitionsMetrics, progressiveMetrics=progressiveMetrics, earlyTermination=earlyTermination)
        return currentResult



class ResultsFileWriter:
    def __init__(self, job_id, parent_folder, folder, n_entries, n_clusters, n_runs, pec_instance):
        self.job_id = job_id
        self.folder = None
        self.n_entries = n_entries
        self.n_clusters = n_clusters
        self.n_runs = n_runs
        self.pec_instance = pec_instance

        
        if parent_folder is not None and folder is None:
            self.folder = Path(parent_folder).joinpath(self.job_id)
            self.folder.mkdir(exist_ok=True, parents=True)
        if folder is not None:
            self.folder = Path(folder)
            self.folder.mkdir(exist_ok=True, parents=True)

        
        self.csv_path = None
        self.hdf5_path = None
        self.hdf5_file = None
        self.hdf5_labels = None
        self.hdf5_partitions = None

        self.initializeFiles()
        

    def initializeFiles(self):
        if self.folder is None: return
        self.csv_path = self.folder.joinpath("results.csv")
        if self.csv_path.exists(): os.remove(self.csv_path)
        self.hdf5_path = self.folder.joinpath("results.hdf5")
        if self.hdf5_path.exists(): os.remove(self.hdf5_path)

        self.hdf5_file = h5py.File(self.hdf5_path, "a")
        self.hdf5_labels = self.hdf5_file.create_dataset("labels",
            (1, self.n_entries), maxshape=(None, self.n_entries), 
            dtype=best_labels_dtype(self.n_clusters), chunks=True)
        self.hdf5_partitions = self.hdf5_file.create_dataset("partitions",
            (1, self.n_runs, self.n_entries), maxshape=(None, self.n_runs, self.n_entries), 
            dtype=best_labels_dtype(self.n_clusters), chunks=True)

    
    def finalizeFiles(self):
        if self.folder is None: return
        self.hdf5_file.flush()
        self.hdf5_file.close()
        

    def close(self):
        self.finalizeFiles()


    def save(self, result):
        if self.folder is None: return
        
        ## save labels and partitions
        iterCount = self.hdf5_partitions.shape[0]
        if iterCount > 1: #add one rows to arrays, rows 0 is already created at beginning
            self.hdf5_labels.resize(iterCount+1, axis=0)
            self.hdf5_partitions.resize(iterCount+1, axis=0)
        #append label and partitions
        self.hdf5_labels[-1] = result.labels
        self.hdf5_partitions[-1] = result.partitions

        #csv
        row = {
            "pec_instance": self.pec_instance,
        }
        row.update(result.info)
        print(row)
        