import numpy as np
import sklearn.metrics

class ClusteringMetrics:
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
        """
        Labels is an np.array of integer from 0 to k-1.
        """
        n = data.shape[0]
        d = data.shape[1]
        k = int(np.max(labels) + 1)
       
       
        unique_labels = np.lib.arraysetops.unique(labels)
        k = unique_labels.shape[0]
        
        centroids = np.full((k, d), np.nan, dtype=float)
        for i in range(k):
            idx = np.argwhere(labels == i).flatten()
            centroids[i] = np.mean(data[idx], axis=0) #mean point inside the cluster
        distances = sklearn.metrics.pairwise.euclidean_distances(data, centroids) #distance of each point to all centroids

        A = distances[np.arange(n), labels] #distance of each point to its cluster centroid
        distances[np.arange(n), labels] = np.Inf #set to infinte the distance to own centroid
        B = np.min(distances, axis=1) #distance to each point to the closer centroid (different from its own cluster)
        M = np.maximum(A, B) #max row wise of A and B
        S = np.sum( (B - A) / M)  / n
        
        return S