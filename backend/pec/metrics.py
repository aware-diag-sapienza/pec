import numpy as np
import sklearn.metrics
import traceback

class ClusteringMetrics:
    @staticmethod
    def _get_clusters(data, labels):
        """
        Returns clusters, centroid, point indexes for each cluster, unique labels
        """
        unique_labels = np.unique(labels)
        clusters_idx = [np.where(labels==l) for l in unique_labels]
        clusters = [data[i] for i in clusters_idx]
        centroids = np.array([np.mean(c, axis=0) for c in clusters], dtype=float)
        return clusters, centroids, clusters_idx, unique_labels

    
    @staticmethod
    def inertia(data, labels):
        result = 0.0

        n = data.shape[0]
        d = data.shape[1]
        unique_labels = np.lib.arraysetops.unique(labels)
        k = unique_labels.shape[0]
        for i in range(k):
            idx = np.argwhere(labels == unique_labels[i]).flatten()
            centroid = np.mean(data[idx], axis=0) #mean point inside the cluster
            #center_idx, _ = pairwise_distances_argmin_min([centroid], data[idx], metric="euclidean") # real point closest to mean_center
            #center = data[idx][center_idx][0]
            result += np.sum(np.square(sklearn.metrics.pairwise.euclidean_distances(data[idx], [centroid])))

        return result / n 
    
    @staticmethod
    def adjusted_rand_score(labels_a, labels_b):
        return sklearn.metrics.adjusted_rand_score(labels_a, labels_b)

    @staticmethod
    def adjusted_mutual_info_score(labels_a, labels_b):
        return sklearn.metrics.adjusted_mutual_info_score(labels_a, labels_b)

    @staticmethod
    def calinsky_harabaz_score(data, labels):
        return sklearn.metrics.calinski_harabasz_score(data, labels)

    @staticmethod
    def davies_bouldin_index(data, labels):
        return sklearn.metrics.davies_bouldin_score(data, labels)
    
    @staticmethod
    def dunn_index(data, labels):
        clusters = []
        for class_name in np.lib.arraysetops.unique(labels):
            idx = np.argwhere(labels == class_name).flatten()
            clusters.append(data[idx])
                
        centroids = [np.mean(cl, axis=0) for cl in clusters]
        centroids_pairwise_distances = sklearn.metrics.pairwise.euclidean_distances(centroids)

        max_cluster_diameter = 0
        for i in range(len(clusters)):
            cluster = clusters[i]
            centroid = centroids[i]
            distances = sklearn.metrics.pairwise.euclidean_distances(cluster, [centroid])
            max_cluster_diameter = max(np.mean(distances), max_cluster_diameter)
                
        idx = np.triu_indices(centroids_pairwise_distances.shape[0], 1)
        min_centroids_distance = np.min(centroids_pairwise_distances[idx])   
        result = min_centroids_distance / max_cluster_diameter
        return result

    @staticmethod
    def silhouette(data, labels):
        return sklearn.metrics.silhouette_score(data, labels)


    @staticmethod
    def simplified_silhouette(data, labels):
        try:
            n = data.shape[0]
            clusters, centroids, clusters_idx, unique_labels = ClusteringMetrics._get_clusters(data, labels)
            distances = sklearn.metrics.pairwise.euclidean_distances(data, centroids) #distance of each point to all centroids

            A = distances[np.arange(n), labels] #distance of each point to its cluster centroid
            distances[np.arange(n), labels] = np.Inf #set to infinte the distance to own centroid
            B = np.min(distances, axis=1) #distance to each point to the closer centroid (different from its own cluster)
            M = np.maximum(A, B) #max row wise of A and B
            S = np.sum( (B - A) / M)  / n
            return S
        except:
            traceback.print_exc()
            return 0

    @staticmethod
    def normalize_labels(data, labels_a, labels_b):
        """
        Normalize labels of 2 clusterings by considering the centroids.
        Resolve the problem of having the same cluster in the two clusterings (a,b) with a different id.

        !!! FUNZIONA SOLO SE labels_a, labels_b HANNO LO STESSO NUMERO DI CLUSTER !!!

        """
        clusters_a, centroids_a, clusters_idx_a, unique_labels_a = ClusteringMetrics._get_clusters(data, labels_a)
        clusters_b, centroids_b, clusters_idx_b, unique_labels_b = ClusteringMetrics._get_clusters(data, labels_b)
        #unique_labels = np.unique(np.concatenate(unique_labels_a, unique_labels_b))
        unique_labels = np.unique(unique_labels_a.tolist() + unique_labels_b.tolist())
        
        distances = np.full((unique_labels.shape[0], unique_labels.shape[0]), np.Inf, dtype=float)
        for i,a in enumerate(unique_labels_a):
            x = np.argwhere(unique_labels == a)
            for j,b in enumerate(unique_labels_b):
                y = np.argwhere(unique_labels == b)
                distances[x,y] = sklearn.metrics.pairwise.euclidean_distances([centroids_a[i]], [centroids_b[j]])[0,0]

        #normalize_a = np.frompyfunc(lambda l: np.where(unique_labels == l)[0][0], 1, 1)
        #normalize_b = np.frompyfunc(lambda l: np.argmin(distances[:,np.argwhere(unique_labels == l)]), 1, 1)
        norm_labels_a = np.array([np.where(unique_labels == l)[0][0] for l in labels_a], dtype=labels_a.dtype) #normalize_a(labels_a)  #
        norm_labels_b = np.array([np.argmin(distances[:,np.argwhere(unique_labels == l)]) for l in labels_b], dtype=labels_b.dtype) #normalize_b(labels_b) #

        return norm_labels_a, norm_labels_b, unique_labels

    @staticmethod
    def clusters_stability(data, labels_a, labels_b):
        n = data.shape[0]
        norm_labels_a, norm_labels_b, unique_labels = ClusteringMetrics.normalize_labels(data, labels_a, labels_b)
        sym = np.full(len(unique_labels), 0, dtype=float)
        for i,l in enumerate(unique_labels):
            a = np.full(n, 0, dtype=np.uint8)
            b = np.full(n, 0, dtype=np.uint8)
            a[np.where(labels_a == l)] = 1
            b[np.where(labels_b == l)] = 1
            sym[i] = sklearn.metrics.jaccard_score(a, b)
        return sym

    @staticmethod
    def entries_stability1(data, labels_a, labels_b):
        norm_labels_a, norm_labels_b, _ = ClusteringMetrics.normalize_labels(data, labels_a, labels_b)
        stab = (norm_labels_a == norm_labels_b).astype(int)
        return stab

    @staticmethod
    def entries_stability2(data, labels_a, labels_b):
        return np.full_like(labels_a, 0, dtype=int)
        E = ClusteringMetrics.entries_stability1(labels_a, labels_b)
        C = ClusteringMetrics.clusters_stability(labels_a, labels_b)[E] #cluster stability for each point
        return E * C

    @staticmethod
    def global_stability0(data, labels_a, labels_b):
        return np.mean(ClusteringMetrics.clusters_stability(data, labels_a, labels_b))
    
    @staticmethod
    def global_stability1(data, labels_a, labels_b):
        return np.mean(ClusteringMetrics.entries_stability1(data, labels_a, labels_b))

    @staticmethod
    def global_stability2(data, labels_a, labels_b):
        return np.mean(ClusteringMetrics.entries_stability2(data, labels_a, labels_b))
        