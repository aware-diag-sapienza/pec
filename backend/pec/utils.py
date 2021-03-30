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
    def __init__(self, info, labels, partitions, metrics={}):
        super().__init__(job_id="", info=info, labels=labels, partitions=partitions, metrics=metrics)
        
###
###
###
class ProgressiveResultInfo(Bunch):
    """ ProgressiveResultInfo """
    def __init__(self,
        timestamp=None,
        iteration=None,
        is_last=False,
        is_last_et=False,
        n_clusters=None,
        n_runs = None,

        best_run=None,
        completed_runs=None,
        runs_iterations=None,
        completed_runs_status=None,
        
        waiting_time = 0,
        decision_time = 0,

        run_iteration_duration_avg=0,
        run_iteration_duration_median=0,
        run_iteration_duration_var=0
        ):
        
        super().__init__(
            timestamp=round(timestamp,_ROUND_TIME),
            iteration=iteration,
            is_last=is_last,
            is_last_et=is_last_et,
            n_clusters=n_clusters,
            n_runs=n_runs,

            best_run=best_run,
            completed_runs=completed_runs,
            runs_iterations="-".join(list(map(lambda i: str(i).zfill(3), runs_iterations))),
            completed_runs_status="-".join(list(map(lambda s: "t" if s else "f", completed_runs_status))),
            
            waiting_time=round(waiting_time, _ROUND_TIME),
            decision_time=round(decision_time, _ROUND_TIME),

            run_iteration_duration_avg=round(run_iteration_duration_avg, _ROUND_TIME),
            run_iteration_duration_median=round(run_iteration_duration_median, _ROUND_TIME),
            run_iteration_duration_var=run_iteration_duration_var
        )
###
###
###
class ProgressiveResultMetrics(Bunch):
    """ ProgressiveResultMetrics """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
###
###
###
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