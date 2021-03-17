from sklearn.utils import Bunch

class PECEvent(Bunch):
    def __init__(self, name, data, **kwargs):
        super().__init__(name=name, data=data, **kwargs)