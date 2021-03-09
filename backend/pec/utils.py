import numpy as np
import time
from sklearn.utils import Bunch
from multiprocessing.shared_memory import SharedMemory
import os, sys

_ROUND_TIME = 6
_ROUND_METRIC = 10

class ProgressiveResult(Bunch):
    """
    ProgressiveResult

    ----------
    parameters:
    
    info : dictionary with information about the result

    labels : numpy array with clustering labels
    """
    def __init__(self, info, labels, partitions):
        super().__init__(job_id="", info=info, labels=labels, partitions=partitions)
        

class ProgressiveResultInfo(Bunch):
    """ ProgressiveResultInfo """
    def __init__(self,
        timestamp=None,
        iteration=None,
        is_last=False,

        n_clusters=None,
        completed_runs=None,
        best_run=None,
        
        runs_iterations=None,
        completed_runs_status=None,

        waiting_time = 0,
        decision_time = 0,
        inertia_time = 0,
        ars_time = 0,
        ami_time = 0,

        avg_run_iteration_duration=0,
        var_run_iteration_duration=0,
        avg_run_iteration_supplemental_time=0,
        var_run_iteration_supplemental_time=0,
        
        runs_inertia=None,
        decision_ars=None,
        decision_ami=None,
        runs_ars_matrix=None,
        runs_ami_matrix=None,

        inertia=0,
        inertia_gradient=0,
        inertia_improvement=0,
        inertia_improvement_gradient=0,

        ars=0,
        ars_gradient=0,
        ami=0,
        ami_gradient=0,
        ):
        
        super().__init__(
            timestamp=round(timestamp,_ROUND_TIME),
            iteration=iteration,
            is_last=is_last,

            n_clusters=n_clusters,
            completed_runs=completed_runs,
            best_run=0,
            
            runs_iterations="-".join(list(map(lambda i: str(i).zfill(3), runs_iterations))),
            completed_runs_status="-".join(list(map(lambda s: "t" if s else "f", completed_runs_status))),
            
            waiting_time=round(waiting_time, _ROUND_TIME),
            decision_time=round(decision_time, _ROUND_TIME),
            inertia_time = round(inertia_time, _ROUND_TIME),
            ars_time = round(ars_time, _ROUND_TIME),
            ami_time = round(ami_time, _ROUND_TIME),

            avg_run_iteration_duration=round(avg_run_iteration_duration, _ROUND_TIME),
            var_run_iteration_duration=var_run_iteration_duration,
            avg_run_iteration_supplemental_time=round(avg_run_iteration_supplemental_time, _ROUND_TIME),
            var_run_iteration_supplemental_time=var_run_iteration_supplemental_time,
            
            runs_inertia=array_to_string(runs_inertia),
            decision_ars = array_to_string(decision_ars),
            decision_ami = array_to_string(decision_ami),
            runs_ars_matrix = matrix_to_string(runs_ars_matrix),
            runs_ami_matrix = matrix_to_string(runs_ami_matrix),

            inertia=round(inertia, _ROUND_METRIC),
            inertia_gradient=round(inertia_gradient, _ROUND_METRIC),
            inertia_improvement=round(inertia_improvement, _ROUND_METRIC),
            inertia_improvement_gradient=round(inertia_improvement_gradient, _ROUND_METRIC),

            ars=ars,
            ars_gradient=ars_gradient,
            ami=ami,
            ami_gradient=ami_gradient
        )


class SharedArray(Bunch):
    def __init__(self, name, shape, dtype):
        super().__init__(name=name, shape=shape, dtype=dtype)
    
    @staticmethod
    def create(data):
        shm = SharedMemory(create=True, size=data.nbytes)
        X = np.ndarray(data.shape, dtype=data.dtype, buffer=shm.buf)
        X[:] = data[:]

        return shm, SharedArray(shm.name, data.shape, data.dtype)
    
    def open(self):
        shm = SharedMemory(name=self.name)
        X = np.ndarray(self.shape, dtype=self.dtype, buffer=shm.buf)
        return shm, X


class TimeManager:
    def __init__(self, start_time=None):
        self.start_time = time.time() if start_time is None else start_time  
        self.__start_pause_timestamp = None
        self.__pauses = [0]
    
    def timestamp(self, round_digits=None):
        t = time.time() - self.start_time - np.sum(self.__pauses)
        if round_digits is None:
            return t
        else:
            return round(t, round_digits)

    def pause(self):
        self.__start_pause_timestamp = time.time()

    def resume(self):
        self.__pauses.append(time.time() - self.__start_pause_timestamp)
        self.__start_pause_timestamp = None


def best_labels_dtype(max_val):
    if max_val <= 127:
        return np.int8
    elif max_val <= 32767:
        return np.int16
    else:
        return np.int32

class HiddenPrints:
    def __enter__(self):
        self._original_stdout = sys.stdout
        sys.stdout = open(os.devnull, 'w')

    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stdout.close()
        sys.stdout = self._original_stdout


def array_to_string(arr):
    return "::".join(list(map(str, arr)))

def matrix_to_string(mx):
    res = []
    for i in range(len(mx)):
        res.append(array_to_string(mx[i]))
    return "||".join(res)