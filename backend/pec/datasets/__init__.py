from pathlib import Path
import numpy as np
from sklearn.decomposition import PCA, KernelPCA
from sklearn.manifold import TSNE, Isomap, MDS
from sklearn.preprocessing import MinMaxScaler

from ..log import Log

DATA_FOLDERS = [Path(__file__).parent.joinpath("real"), Path(__file__).parent.joinpath("benchmark"), Path(__file__).parent.joinpath("custom")]

class Dataset:
    def __init__(self, name):
        self.dict = None
        for folder in DATA_FOLDERS:
            for file in folder.joinpath("data").glob("*.csv"):
                if name != file.stem: continue
                data = np.loadtxt(file, delimiter=",", skiprows=1, dtype=float)
                self.dict = {
                    "name": name,
                    "n": data.shape[0],
                    "d": data.shape[1],
                    "k": 0,
                    "data": data,
                    "projections": {
                        "pca": self.loadPCA(file, data),
                        "tsne": self.loadTSNE(file, data)
                    } 
                }
                
                '''
                for pfolder in file.parent.parent.joinpath("projections").glob("*"):
                    if pfolder.is_dir():
                        pname = pfolder.stem
                        proj = np.loadtxt(pfolder.joinpath(f"{name}.csv"), delimiter=",", skiprows=1, dtype=float)
                        self.dict["projections"][pname] = proj
                break
                '''
            if self.dict is not None: break

    def data(self):
        return self.dict["data"]

    def name(self):
        return self.dict["name"]
    
    @staticmethod
    def allInfo():
        result = []
        for folder in DATA_FOLDERS:
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


    def loadPCA(self, datasetFile, data):
        folder = datasetFile.parent.parent.joinpath("projections", "pca")
        folder.mkdir(exist_ok=True, parents=True)
        projFile = folder.joinpath(datasetFile.name)
        if projFile.is_file():
            proj = np.loadtxt(projFile, delimiter=",", skiprows=1, dtype=float)
            return proj
        else:
            Log.print(f"Creating PCA projection of {datasetFile.name}")
            proj = MinMaxScaler().fit_transform( PCA(n_components=2, random_state=0).fit_transform(data) ) if data.shape[1] > 2 else data
            np.savetxt(projFile, proj, delimiter=",", header="x,y", comments="")
            return proj
    
    def loadTSNE(self, datasetFile, data):
        folder = datasetFile.parent.parent.joinpath("projections", "tsne")
        folder.mkdir(exist_ok=True, parents=True)
        projFile = folder.joinpath(datasetFile.name)
        if projFile.is_file():
            proj = np.loadtxt(projFile, delimiter=",", skiprows=1, dtype=float)
            return proj
        else:
            Log.print(f"Creating TSNE projection of {datasetFile.name}")
            proj = MinMaxScaler().fit_transform( TSNE(n_components=2, random_state=0).fit_transform(data) )  if data.shape[1] > 2 else data
            np.savetxt(projFile, proj, delimiter=",", header="x,y", comments="")
            return proj



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