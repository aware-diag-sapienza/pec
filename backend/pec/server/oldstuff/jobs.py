from multiprocessing import Queue
from threading import Thread
import datetime

from ..datasets import Dataset
from ..pec_instances import I_PecK, I_PecKPP, MCLA_PecK, MCLA_PecKPP, HGPA_PecK, HGPA_PecKPP
from ..pec_instances import TEPMLATE_ID_PLACEHOLDER


class _JobExecutor(Thread):
    def __init__(self, type, dataset, n_clusters, n_runs, random_state, queue, synchronous=False, template_id=None, **kwargs):
        super().__init__(**kwargs)
        self.queue = queue
        self.active = True

        self.type = type
        self.dataset = dataset
        self.n_clusters = n_clusters
        self.n_runs = n_runs
        self.random_state = random_state
        self.synchronous = synchronous

        self.pec = self.instantiatePec(self.partialResultCallback, template_id)
        self.id = self.pec.job_id

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

    def run(self):
        self.pec.start()
    
    def partialResultCallback(self, pr):
        self.queue.put(pr)
        if self.synchronous:
            ack = None
            while ack != "ack":
                ack = self.queue.get()

    def stop(self):
        self.pec.stop()



class AsyncJob(Thread):
    def __init__(self, type, dataset, n_clusters, n_runs, random_state, callback, client_id=None, **kwargs):
        super().__init__(**kwargs)
        template_id = f"AsyncJob:{TEPMLATE_ID_PLACEHOLDER}:{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        if client_id is not None: template_id += f":{client_id}"
        self.queue = Queue()
        self.executor = _JobExecutor(type, dataset, n_clusters, n_runs, random_state, self.queue, synchronous=False, template_id=template_id)
        self.active = True
        self.callback = callback
        self.id = self.executor.id

    def run(self):
        while self.active:
            partial_result = self.queue.get()
            self.active = not partial_result.info.is_last
            if self.callback is not None: self.callback(partial_result)

    def start(self):
        self.executor.start()
        return super().start()

    def stop(self):
        self.executor.stop()
        self.active = False

'''
class SyncJob(Thread):
    def __init__(self, type, dataset, n_clusters, n_runs, random_state, callback, client_id=None, **kwargs):
        super().__init__(**kwargs)
        template_id = f"SyncJob:{TEPMLATE_ID_PLACEHOLDER}:{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        if client_id is not None: template_id += f":{client_id}"
        self.queue = Queue()
        self.executor = _JobExecutor(type, dataset, n_clusters, n_runs, random_state, self.queue, synchronous=True, template_id=template_id)
        self.active = True
        self.callback = callback
        self.id = self.executor.id
    
    def sendAck(self):
        self.queue.put("ack")

    def run(self):
        
        def ack_fn():
            self.queue.put("ack")

        while self.active:
            partial_result = self.queue.get()
            self.active = not partial_result.info.is_last
            if self.callback is not None: self.callback(partial_result, ack_fn)

    def start(self):
        self.executor.start()
        return super().start()

    def stop(self):
        self.executor.stop()
        self.active = False
'''