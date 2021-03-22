import datetime
from sklearn.utils import Bunch
from threading import Thread
from multiprocessing import Process

from ..datasets import Dataset
from ..pec_instances import I_PecK, I_PecKPP, MCLA_PecK, MCLA_PecKPP, HGPA_PecK, HGPA_PecKPP
from ..pec_instances import TEPMLATE_ID_PLACEHOLDER



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
        ##remove partitions in partial result
        pr.partitions = None
        self.partialResultsQueue.put(Bunch(client=self.client, jobId=self.id, pr=pr))

    
    def run(self):
        self.pec.start()