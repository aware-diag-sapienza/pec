import os
import time
import numpy as np
from multiprocessing import Process


from ..utils import best_labels_dtype, ProgressiveResult, ProgressiveResultInfo
from ..events import IterationResultEvent, Ack
from ..metrics import ClusteringMetrics


class InertiaBased_ProgressiveDecisionWorker(Process):
    """ Inertia Based Progressive Decision Worker """
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
        if self.verbose: print(f"[{self.__class__.__name__}] started with pid={os.getpid()}.")
        #shm_data, _ = self.shared_data.open()
        shm_partitions, partitions = self.shared_partitions.open()
        
        previous_labels = None
        best_inertia = np.inf
        runs_completed = np.array([False for _ in range(self.n_runs)])
        runs_iterations = np.array([-1 for _ in range(self.n_runs)], dtype=int)
        runs_iteration_duration = [None for _ in range(self.n_runs)]
        runs_iteration_supplemental_time = [None for _ in range(self.n_runs)]
        runs_inertia = np.array([np.nan for _ in range(self.n_runs)], dtype=float)

        best_run_history = []
        inertia_history = []
        inertia_improvement_history = []
        ars_history = []
        ami_history = []

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
                    runs_iteration_supplemental_time[i] = event.supplemental_time
                    runs_inertia[i] = event.inertia
                else:
                    raise RuntimeError(f"[{self.__class__.__name__}] Expected an IterationResultEvent, got {event.__class__.__name__}")
            timestamp_after_run_results = time.time()
            
            ## compute decision
            timestamp_before_decision = time.time()
            
            best_inertia = np.min(runs_inertia)
            inertia_history.append(best_inertia)
            inertia_gradient = np.inf if len(inertia_history) <= 1 else np.gradient(inertia_history)[-1]
            
            best_run = np.argmin(runs_inertia)
            if (len(best_run_history) != 0) and (runs_inertia[best_run_history[-1]] == best_inertia):
                best_run = best_run_history[-1]
            best_run_history.append(best_run)
            best_labels = partitions[best_run,:]
       
            inertia_improvement = (inertia_history[0] - best_inertia) / inertia_history[0] 
            inertia_improvement_history.append(inertia_improvement)
            inertia_improvement_gradient = np.inf if len(inertia_improvement_history) <= 1 else np.gradient(inertia_improvement_history)[-1]
            timestamp_after_decision = time.time()

            timestamp_before_ars = time.time()
            ars = ClusteringMetrics.adjusted_rand_score(best_labels, previous_labels) if previous_labels is not None else 1
            ars_history.append(ars)
            ars_gradient = np.inf if len(ars_history) <= 1 else np.gradient(ars_history)[-1]
            timestamp_after_ars = time.time()

            timestamp_before_ami = time.time()
            ami = ClusteringMetrics.adjusted_mutual_info_score(best_labels, previous_labels) if previous_labels is not None else 1
            ami_history.append(ami)
            ami_gradient = np.inf if len(ami_history) <= 1 else np.gradient(ami_history)[-1]
            timestamp_after_ami = time.time()


            decision_ars = np.full(self.n_runs, 1, float)
            decision_ami = np.full(self.n_runs, 1, float)
            runs_ars_matrix = np.full((self.n_runs, self.n_runs), 1, float)
            runs_ami_matrix = np.full((self.n_runs, self.n_runs), 1, float)
            for i in range(self.n_runs):
                decision_ars[i] = ClusteringMetrics.adjusted_rand_score(partitions[i,:], best_labels)
                decision_ami[i] = ClusteringMetrics.adjusted_mutual_info_score(partitions[i,:], best_labels)
                for j in range(self.n_runs):
                    runs_ars_matrix[i,j] = ClusteringMetrics.adjusted_rand_score(partitions[i,:], partitions[j,:])
                    runs_ars_matrix[j,i] = runs_ars_matrix[i,j]

                    runs_ami_matrix[i,j] = ClusteringMetrics.adjusted_mutual_info_score(partitions[i,:], partitions[j,:])
                    runs_ami_matrix[j,i] = runs_ami_matrix[i,j]
            
            ## decision computed

            ## send result event
            result_timestamp = time.time() - self.start_time
            result_info = ProgressiveResultInfo(
                iteration = self.progressive_iteration,
                timestamp = result_timestamp,
                is_last = np.all(runs_completed),
                n_clusters = self.n_clusters,
                completed_runs = len(np.argwhere(runs_completed == True).flatten()),
                best_run = best_run,
                runs_iterations = runs_iterations.tolist(),
                completed_runs_status = runs_completed.tolist(),
                
                waiting_time = timestamp_after_run_results - timestamp_before_run_results,
                decision_time = timestamp_after_decision - timestamp_before_decision,
                inertia_time = 0,
                ars_time = timestamp_after_ars - timestamp_before_ars,
                ami_time = timestamp_after_ami - timestamp_before_ami,
                
                avg_run_iteration_duration = np.mean(runs_iteration_duration),
                var_run_iteration_duration = np.var(runs_iteration_duration),
                avg_run_iteration_supplemental_time = np.mean(runs_iteration_supplemental_time),
                var_run_iteration_supplemental_time = np.var(runs_iteration_supplemental_time),

                runs_inertia = runs_inertia.tolist(),
                decision_ars = decision_ars.tolist(),
                decision_ami = decision_ami.tolist(),
                runs_ars_matrix = runs_ars_matrix,
                runs_ami_matrix = runs_ami_matrix,

                
                inertia = best_inertia,
                inertia_gradient = inertia_gradient,
                inertia_improvement = inertia_improvement,
                inertia_improvement_gradient = inertia_improvement_gradient,

                ars = ars,
                ars_gradient = ars_gradient,
                ami = ami,
                ami_gradient = ami_gradient
            )
            result_labels = best_labels
            previous_labels = best_labels
            progressive_result = ProgressiveResult(result_info, result_labels, np.copy(partitions))

            self.partial_results_queue.put(progressive_result)
            self.progressive_iteration += 1
            
            for i in range(self.n_runs):
                if not runs_completed[i]:
                    self.run_ack_queue_arr[i].put(Ack())


        #shm_data.close()
        shm_partitions.close()
        if self.verbose: print(f"[{self.__class__.__name__}] terminated.")