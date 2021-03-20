import numpy as np
import math
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
        n = data.shape[0]
        clusters, centroids, clusters_idx, unique_labels = ClusteringMetrics._get_clusters(data, labels)
        distances = sklearn.metrics.pairwise.euclidean_distances(data, centroids) #distance of each point to all centroids
        try:
            A = distances[np.arange(n), labels] #distance of each point to its cluster centroid
            distances[np.arange(n), labels] = np.Inf #set to infinte the distance to own centroid
            B = np.min(distances, axis=1) #distance to each point to the closer centroid (different from its own cluster)
            M = np.maximum(A, B) #max row wise of A and B
            S = np.sum( (B - A) / M)  / n
            return S
        except:
            traceback.print_exc()
            print(n, centroids.shape, distances.shape, labels.shape)
            return 0

    
    @staticmethod
    def smooth_labels_jaccard(data, prev, curr):
        """
        Smooth current labels in order to have less difference with previous.

        !!! FUNZIONA SOLO SE prev e curr HANNO LO STESSO NUMERO DI CLUSTER, ALTRIMENTI RITORNA curr !!!
        """
        unique_prev = np.unique(prev)
        unique_curr = np.unique(curr)
        if len(unique_prev) != len(unique_curr):
            return curr
        
        clusters_prev = [None] * len(unique_prev)
        for i,l in enumerate(unique_prev):
            clusters_prev[i] = np.full_like(prev, 0, dtype=np.uint8)
            clusters_prev[i][np.where(prev == l)] = 1

        clusters_curr = [None] * len(unique_curr)
        for i,l in enumerate(unique_curr):
            clusters_curr[i] = np.full_like(curr, 0, dtype=np.uint8)
            clusters_curr[i][np.where(curr == l)] = 1
        
        #jaccard
        result = curr.copy()
        for c in clusters_curr:
            sim = [ sklearn.metrics.jaccard_score(c, p) for p in clusters_prev]
            i = np.argmax(sim) #best index
            l = unique_prev[i] #best label
            #remove assigned cluster
            np.delete(unique_prev, i)
            np.delete(clusters_prev, i)
            #update result
            result[np.where(c)] = l
        
        return result

    
    @staticmethod
    def smooth_labels(data, prev, curr):
        """
        Smooth current labels in order to have less difference with previous.

        !!! FUNZIONA SOLO SE prev e curr HANNO LO STESSO NUMERO DI CLUSTER, ALTRIMENTI RITORNA curr !!!
        """
        unique_prev = np.unique(prev)
        unique_curr = np.unique(curr)
        if len(unique_prev) != len(unique_curr):
            return curr

        _, centroids_prev, _, _ = ClusteringMetrics._get_clusters(data, prev)
        _, centroids_curr, _, _ = ClusteringMetrics._get_clusters(data, curr)
        
        result = curr.copy()
        for c in centroids_curr:
            dist = [ sklearn.metrics.pairwise.euclidean_distances([c], [p])[0,0] for p in centroids_prev]
            i = np.argmin(dist) #best index
            l = unique_prev[i] #best label
            #remove assigned cluster
            np.delete(unique_prev, i)
            np.delete(centroids_prev, i)
            #update result
            result[np.where(c)] = l
        
        return result


    @staticmethod
    def clusters_stability(prev_labels, curr_labels):
        n = prev_labels.shape[0]
        unique_labels = np.unique(curr_labels)
        similarity = np.full(len(unique_labels), 0, dtype=float)
        for i,l in enumerate(unique_labels):
            a = np.full(n, 0, dtype=np.uint8)
            b = np.full(n, 0, dtype=np.uint8)
            a[np.where(prev_labels == l)] = 1
            b[np.where(curr_labels == l)] = 1
            similarity[i] = sklearn.metrics.jaccard_score(a, b)
        return similarity

    @staticmethod
    def entries_stability1(prev_labels, curr_labels):
        return (prev_labels == curr_labels).astype(np.uint8)
        
    @staticmethod
    def entries_stability2(labelsHistory):
        stability = np.full_like(labelsHistory[0], 0, dtype=float)
        h = len(labelsHistory)
        w = [math.log(2 + i) for i in range(h)] #log weights
        #w = [math.exp(i+1) for i in range(h)] #log weights

        if h < 5: return stability

        for i in range(h-1):
            stability += ( (labelsHistory[h-1] == labelsHistory[i]).astype(float) * w[i] ) / sum(w)  
        return stability
        
    @staticmethod
    def global_stability0(prev_labels, curr_labels):
        return np.mean(ClusteringMetrics.clusters_stability(prev_labels, curr_labels))
    
    @staticmethod
    def global_stability1(prev_labels, curr_labels):
        return np.mean(ClusteringMetrics.entries_stability1(prev_labels, curr_labels))

    @staticmethod
    def global_stability2(labelsHistory):
        return np.mean(ClusteringMetrics.entries_stability2(labelsHistory))
        