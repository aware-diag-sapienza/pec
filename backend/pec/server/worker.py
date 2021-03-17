from multiprocessing import Process


class WorkerProcess(Process):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def run(self):
        pass