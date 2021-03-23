import datetime
from sklearn.utils import Bunch
from threading import Thread
from multiprocessing import Process
from sklearn.utils import check_random_state
import numpy as np

from ..datasets import Dataset
from ..pec_instances import I_PecK, I_PecKPP, MCLA_PecK, MCLA_PecKPP, HGPA_PecK, HGPA_PecKPP
from ..pec_instances import TEPMLATE_ID_PLACEHOLDER
from ..log import Log



class AsyncJob(Process):
    def __init__(self, type, dataset, n_clusters, n_runs, random_state, partialResultsQueue, client=None, **kwargs):
        super().__init__(**kwargs)
        template_id = f"AsyncJob:{TEPMLATE_ID_PLACEHOLDER}:{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        if client is not None: template_id += f":{client}"

        self.type = type
        self.dataset = dataset
        self.n_clusters = n_clusters
        self.n_runs = n_runs
        self.random_state = random_state
        self.partialResultsQueue = partialResultsQueue


        self.pec = self.instantiatePec(self.partialResultCallback, template_id)
        self.id = self.pec.job_id
        self.client = client

    
    def instantiatePec(self, callback, template_id):
        data = Dataset(self.dataset).data()
        pec = None
        if self.type == "I-PecK":
            pec = I_PecK(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "I-PecK++":
            pec = I_PecKPP(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "HGPA-PecK":
            pec = HGPA_PecK(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "HGPA-PecK++":
            pec = HGPA_PecKPP(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "MCLA-PecK":
            pec = MCLA_PecK(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "MCLA-PecK++":
            pec = MCLA_PecKPP(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        else:
            raise RuntimeError(f"Undefined pec type '{self.type}'")
        return pec

    def partialResultCallback(self, pr):
        self.partialResultsQueue.put(Bunch(jobType="AsyncJob", client=self.client, jobId=self.id, pr=pr))

    
    def run(self):
        self.pec.start()





class ElbowJob(Process):
    def __init__(self, type, dataset, min_n_clusters, max_n_clusters, n_runs, random_state, partialResultsQueue, client=None, earlyTermination=None, **kwargs):
        super().__init__(**kwargs)
        self.id = f"ElbowJob:{dataset}:{min_n_clusters}:{max_n_clusters}:{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}:{client}"
        self.client = client
       
        self.type = type
        self.dataset = dataset
        self.n_runs = n_runs
        self.min_n_clusters = min_n_clusters
        self.max_n_clusters = max_n_clusters
        self.k_values = list(range(self.min_n_clusters, self.max_n_clusters+1))
        self.random_state_arr = check_random_state(random_state).randint(np.iinfo(np.int32).max, size=len(self.k_values))
        self.earlyTermination = earlyTermination
        self.partialResultsQueue = partialResultsQueue
        self.data = Dataset(self.dataset).data()

        self.currentPec = None
        self.isLastK = False
    
    def instantiatePec(self, n_clusters, random_state, callback):
        pec = None
        if self.type == "I-PecK":
            pec = I_PecK(self.data, n_clusters=n_clusters, n_runs=self.n_runs, random_state=random_state, dataset_name=self.dataset, results_callback=callback)
        elif self.type == "I-PecK++":
            pec = I_PecKPP(self.data, n_clusters=n_clusters, n_runs=self.n_runs, random_state=random_state, dataset_name=self.dataset, results_callback=callback)
        elif self.type == "HGPA-PecK":
            pec = HGPA_PecK(self.data, n_clusters=n_clusters, n_runs=self.n_runs, random_state=random_state, dataset_name=self.dataset, results_callback=callback)
        elif self.type == "HGPA-PecK++":
            pec = HGPA_PecKPP(self.data, n_clusters=n_clusters, n_runs=self.n_runs, random_state=random_state, dataset_name=self.dataset, results_callback=callback)
        elif self.type == "MCLA-PecK":
            pec = MCLA_PecK(self.data, n_clusters=n_clusters, n_runs=self.n_runs, random_state=random_state, dataset_name=self.dataset, results_callback=callback)
        elif self.type == "MCLA-PecK++":
            pec = MCLA_PecKPP(self.data, n_clusters=n_clusters, n_runs=self.n_runs, random_state=random_state, dataset_name=self.dataset, results_callback=callback)
        else:
            raise RuntimeError(f"Undefined pec type '{self.type}'")
        return pec

    def partialResultCallback(self, pr):
        k = pr.info.n_clusters
        
        toPrint = f"{Log.GRAY}k = {k} @ it = {pr.info.iteration}"
        if self.earlyTermination == "fast":
            if pr.metrics.earlyTermination.fast:
                toPrint += f" -- {Log.GREEN}Fast EarlyTermination{Log.ENDC}"
        elif self.earlyTermination == "slow":
            if pr.metrics.earlyTermination.slow:
                toPrint += f" -- {Log.BLUE}Slow EarlyTermination{Log.ENDC}"
        else:
            if pr.info.is_last:
                toPrint += f" -- {Log.ENDC}Normal Termination{Log.ENDC}"
        
        Log.print(toPrint)

                

        if (self.earlyTermination == "fast" and pr.metrics.earlyTermination.fast) or  (self.earlyTermination == "slow" and pr.metrics.earlyTermination.slow) or pr.info.is_last:
            inertia = pr.metrics.labelsMetrics["inertia"]
            labels = pr.labels
            result = Bunch(jobId=self.id, k=k, inertia=inertia, isLast=self.isLastK, labels=labels)
            self.partialResultsQueue.put(Bunch(jobType="ElbowJob", client=self.client, jobId=self.id, pr=result))
            if not pr.info.is_last: self.currentPec.stop()
        
        
    def run(self):
        for i,k in enumerate(self.k_values):
            self.isLastK = (k == self.k_values[-1])
            self.currentPec = self.instantiatePec(k, self.random_state_arr[i], self.partialResultCallback)
            self.currentPec.start()
        