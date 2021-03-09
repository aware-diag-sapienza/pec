from pathlib import Path
import numpy as np

class Dataset:
    def __init__(self, name):
        self.dict = None
        for folder in [Path(__file__).parent.joinpath("real"), Path(__file__).parent.joinpath("benchmark")]:
            for file in folder.joinpath("data").glob("*.csv"):
                if name != file.stem: continue
                data = np.loadtxt(file, delimiter=",", skiprows=1, dtype=float)
                self.dict = {
                    "name": name,
                    "n": data.shape[0],
                    "d": data.shape[1],
                    "k": 0,
                    "data": data,
                    "projections": {} 
                }
                for pfolder in file.parent.parent.joinpath("projections").glob("*"):
                    if pfolder.is_dir():
                        pname = pfolder.stem
                        proj = np.loadtxt(pfolder.joinpath(f"{name}.csv"), delimiter=",", skiprows=1, dtype=float)
                        self.dict["projections"][pname] = proj
                break
            if self.dict is not None: break

    def data(self):
        return self.dict["data"]

    def name(self):
        return self.dict["name"]
    
    @staticmethod
    def allInfo():
        result = []
        for folder in [Path(__file__).parent.joinpath("real"), Path(__file__).parent.joinpath("benchmark")]:
            for file in folder.joinpath("data").glob("*.csv"):
                datasetName = file.stem
                data = np.loadtxt(file, delimiter=",", skiprows=1, dtype=float)
                entry = {
                    "name": datasetName,
                    "n": data.shape[0],
                    "d": data.shape[1],
                    "k": 0,
                }
                result.append(entry)

        result = sorted(result, key=lambda d: d["name"])
        return result




"""
def loadDatasetsInfo():
    '''
    load datasets info 
    '''
    result = []
    for folder in [Path(__file__).parent.joinpath("real"), Path(__file__).parent.joinpath("benchmark")]:
        for file in folder.joinpath("data").glob("*.csv"):
            datasetName = file.stem
            data = np.loadtxt(file, delimiter=",", skiprows=1, dtype=float)
            entry = {
                "name": datasetName,
                "n": data.shape[0],
                "d": data.shape[1],
                "k": 0,
            }
            result.append(entry)

    result = sorted(result, key=lambda d: d["name"])

    return result
"""   

"""
def loadDataset(name):
    for folder in [Path(__file__).parent.joinpath("real"), Path(__file__).parent.joinpath("benchmark")]:
        for file in folder.joinpath("data").glob("*.csv"):
            if name != file.stem: continue
            data = np.loadtxt(file, delimiter=",", skiprows=1, dtype=float)
            result = {
                "name": name,
                "n": data.shape[0],
                "d": data.shape[1],
                "k": 0,
                "data": data,
                "projections": {} 
            }
            for pfolder in file.parent.parent.joinpath("projections").glob("*"):
                if pfolder.is_dir():
                    pname = pfolder.stem
                    proj = np.loadtxt(pfolder.joinpath(f"{name}.csv"), delimiter=",", skiprows=1, dtype=float)
                    result["projections"][pname] = proj
            
            return result
"""