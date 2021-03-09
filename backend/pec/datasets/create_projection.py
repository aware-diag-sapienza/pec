from pathlib import Path
import numpy as np
from sklearn.decomposition import PCA, KernelPCA
from sklearn.manifold import TSNE, Isomap, MDS
from sklearn.preprocessing import MinMaxScaler


for folder in [Path(__file__).parent.joinpath("real", "data"), Path(__file__).parent.joinpath("benchmark", "data")]:
    for f in folder.glob("*.csv"):
        data = np.loadtxt(f, delimiter=",", skiprows=1, dtype=float)
        proj = {
            "pca": MinMaxScaler().fit_transform( PCA(n_components=2, random_state=0).fit_transform(data) ) if data.shape[1] > 2 else data,
            #"kpca": KernelPCA(n_components=2, random_state=0, kernel="sigmoid").fit_transform(data),
            "tsne": MinMaxScaler().fit_transform( TSNE(n_components=2, random_state=0).fit_transform(data) )  if data.shape[1] > 2 else data,
            #"isomap": Isomap(n_components=2).fit_transform(data),
            #"mds": MDS(n_components=2, random_state=0).fit_transform(data)
        }

        for pname in proj:
            proj_folder = f.parent.parent.joinpath("projections", pname)
            proj_folder.mkdir(exist_ok=True, parents=True)
            np.savetxt(proj_folder.joinpath(f"{f.stem}.csv"), proj[pname], delimiter=",", header="x,y", comments="")

        print(f"Computed {f.stem}")





