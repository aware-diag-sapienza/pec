import os
import time
import numpy as np
import importlib
from multiprocessing import Process

from ..utils import best_labels_dtype, ProgressiveResult, ProgressiveResultInfo, HiddenPrints
from ..events import IterationResultEvent, Ack
from ..metrics import ClusteringMetrics
#import Cluster_Ensembles as Cluster_Ensembles


class HGPA_ProgressiveDecisionWorker(Process):
    """ HGPA Progressive Decision Worker """
    def __init__(self, shared_data, shared_partitions, n_clusters, 
        partial_results_queue, run_results_queue_arr, run_ack_queue_arr, run_lock_arr,
        start_time=None, verbose=False, **kwargs):
        super().__init__(**kwargs)
        self.shared_data = shared_data
        self.shared_partitions = shared_partitions
        self.n_clusters = n_clusters
        
        self.partial_results_queue = partial_results_queue
        self.run_results_queue_arr = run_results_queue_arr
        self.run_ack_queue_arr = run_ack_queue_arr
        self.run_lock_arr = run_lock_arr
        
        self.n_runs = len(run_results_queue_arr)
        self.start_time = start_time if start_time is not None else time.time()
        self.verbose = verbose
        self.progressive_iteration = 0

    def run(self):
        Cluster_Ensembles = importlib.import_module("Cluster_Ensembles")
        if self.verbose: print(f"[{self.__class__.__name__}] started with pid={os.getpid()}.")
        shm_data, data = self.shared_data.open()
        shm_partitions, partitions = self.shared_partitions.open()
        
        
        runs_completed = np.array([False for _ in range(self.n_runs)])
        runs_iterations = np.array([-1 for _ in range(self.n_runs)], dtype=int)
        runs_iteration_duration = [None for _ in range(self.n_runs)]

        while not np.all(runs_completed):
            ## get one result from each run
            timestamp_before_run_results = time.time()
            for i in range(self.n_runs):
                if runs_completed[i]: continue
                event = self.run_results_queue_arr[i].get()
                if isinstance(event, IterationResultEvent):
                    runs_completed[i] = event.is_last
                    runs_iterations[i] = event.iteration + 1
                    runs_iteration_duration[i] = event.iteration_duration
                else:
                    raise RuntimeError(f"[{self.__class__.__name__}] Expected an IterationResultEvent, got {event.__class__.__name__}")
            timestamp_after_run_results = time.time()
            
            ### 
            ### compute decision
            ###
            timestamp_before_decision = time.time()
            hgpa_labels = Cluster_Ensembles.hgpa_ensemble(partitions, N_clusters_max=self.n_clusters, verbose=False)
            hgpa_n_clusters = len(np.lib.arraysetops.unique(hgpa_labels))
            timestamp_after_decision = time.time()
            ## decision computed

            ## send result event
            result_timestamp = time.time() - self.start_time
            result_info = ProgressiveResultInfo(
                timestamp = result_timestamp,
                iteration = self.progressive_iteration,
                is_last = np.all(runs_completed),
                n_clusters = hgpa_n_clusters,
                n_runs = self.n_runs,

                best_run = None,
                completed_runs = len(np.argwhere(runs_completed == True).flatten()),
                runs_iterations = runs_iterations.tolist(),
                completed_runs_status = runs_completed.tolist(),
                
                waiting_time = timestamp_after_run_results - timestamp_before_run_results,
                decision_time = timestamp_after_decision - timestamp_before_decision,
                
                run_iteration_duration_avg = np.mean(runs_iteration_duration),
                run_iteration_duration_median = np.median(runs_iteration_duration),
                run_iteration_duration_var = np.var(runs_iteration_duration),
            )

            result_labels = hgpa_labels
            progressive_result = ProgressiveResult(result_info, result_labels, np.copy(partitions))

            self.partial_results_queue.put(progressive_result)
            self.progressive_iteration += 1

            for i in range(self.n_runs):
                if not runs_completed[i]:
                    self.run_ack_queue_arr[i].put(Ack())


        shm_data.close()
        shm_partitions.close()
        if self.verbose: print(f"[{self.__class__.__name__}] terminated.")