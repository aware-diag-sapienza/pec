import time
from pec import Dataset
from pec import I_PecK, I_PecKPP
from pec import ClusteringMetrics
from sklearn.cluster import KMeans

from pec.labels import adjustPartitions


from multiprocessing import Pool
import numpy as np

def fn_kmeans(args):
    startTime = time.time()
    (i, data, k) = args
    labels = KMeans(n_clusters=k, init='random', n_init=1, max_iter=300).fit_predict(data)
    endTime = time.time()
    print(f"Run {i} k={k} kmeans completed in {round(endTime - startTime, 2)} sec")
    return labels

def fn_kmeanspp(args):
    startTime = time.time()
    (i, data, k) = args
    labels = KMeans(n_clusters=k, init='k-means++', n_init=1, max_iter=300).fit_predict(data)
    endTime = time.time()
    print(f"Run {i} k={k} kmeans++ completed in {round(endTime - startTime, 2)} sec")
    return labels

'''
def fn_kmeans_pp(data, k, seed):
    labels = KMeans(n_clusters=k, init='k-means++', n_init=1, max_iter=300, random_state=seed).fit_predict(data)
    return labels
'''

def computeMetrics(data, partitions):
    n_runs = partitions.shape[0]
    labels = partitions[0] ## prendo come labels la prima partizione

    fn_inertia = lambda labels, data: ClusteringMetrics.inertia(data, labels)
    fn_calinsky = lambda labels, data: ClusteringMetrics.calinsky_harabaz_score(data, labels)
    fn_dbindex = lambda labels, data: ClusteringMetrics.davies_bouldin_index(data, labels)
    fn_dunnindex = lambda labels, data: ClusteringMetrics.dunn_index(data, labels)
    fn_ssil = lambda labels, data: ClusteringMetrics.simplified_silhouette(data, labels)

    labelsMetrics = {
        "inertia": ClusteringMetrics.inertia(data, labels),
        "dbIndex": ClusteringMetrics.davies_bouldin_index(data, labels),
        "dunnIndex": ClusteringMetrics.dunn_index(data, labels),
        "calinskyHarabasz": ClusteringMetrics.calinsky_harabaz_score(data, labels),
        "adjustedRandScore": np.ones(n_runs, dtype=float),
        "adjustedMutualInfoScore": np.ones(n_runs, dtype=float),
        "simplifiedSilhouette": ClusteringMetrics.simplified_silhouette(data, labels),
    }
    partitionsMetrics = {
        "inertia": np.apply_along_axis(fn_inertia, 1, partitions, data),
        "dbIndex": np.apply_along_axis(fn_dbindex, 1, partitions, data),
        "dunnIndex": np.apply_along_axis(fn_dunnindex, 1, partitions, data),
        "calinskyHarabasz": np.apply_along_axis(fn_calinsky, 1, partitions, data),
        "adjustedRandScore": np.ones((n_runs, n_runs), dtype=float),
        "adjustedMutualInfoScore": np.ones((n_runs, n_runs), dtype=float),
        "simplifiedSilhouette": np.apply_along_axis(fn_ssil, 1, partitions, data),

        "averageAdjustedRandScore": np.zeros((n_runs, n_runs), dtype=float),
        "averageAdjustedMutualInfoScore": np.zeros((n_runs, n_runs), dtype=float),
    }
        
    for i in range(n_runs):
        labelsMetrics["adjustedRandScore"][i] = ClusteringMetrics.adjusted_rand_score(partitions[i], labels)
        labelsMetrics["adjustedMutualInfoScore"][i] = ClusteringMetrics.adjusted_mutual_info_score(partitions[i], labels)
        for j in range(n_runs):
            partitionsMetrics["adjustedRandScore"][i,j] = ClusteringMetrics.adjusted_rand_score(partitions[i], partitions[j])
            partitionsMetrics["adjustedMutualInfoScore"][i,j] = ClusteringMetrics.adjusted_mutual_info_score(partitions[i], partitions[j])





def clustrophile(data, klist, r):
    startTime = time.time()

    result = {}

    for k in klist:
        args = [(i, data, k) for i in range(r)]
        pool = Pool(r)
        partitions = np.array( pool.map(fn_kmeans, args) )
        pool.close()
        pool.join()

        partitions = adjustPartitions(partitions, partitions[0])
        result[k] = partitions
        computeMetrics(data, partitions)
    
    endTime = time.time()

    return int(endTime - startTime)


def clustrophilepp(data, klist, r):
    startTime = time.time()

    result = {}

    for k in klist:
        args = [(i, data, k) for i in range(r)]
        pool = Pool(r)
        partitions = np.array( pool.map(fn_kmeanspp, args) )
        pool.close()
        pool.join()

        partitions = adjustPartitions(partitions, partitions[0])
        result[k] = partitions
        computeMetrics(data, partitions)
    
    endTime = time.time()

    return int(endTime - startTime)



if __name__ == "__main__":
    dataset = Dataset("Tracks-Sampled")
    klist = range(2, 21)
    r = 16

    
    t = clustrophile(dataset.data(), klist, r)
    print(f"\n\nClustrophile2 kmeans {t} sec")

    t = clustrophile(dataset.data(), klist, r)
    print(f"\n\nClustrophile2 kmeans++ {t} sec")

