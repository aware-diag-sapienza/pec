from .pec import ProgressiveEnsembleClustering
TEPMLATE_ID_PLACEHOLDER = "<!!&!!>"

class I_PecK(ProgressiveEnsembleClustering):
    """ Inertia Based Progressive Ensemble Kmeans """
    name = "I-PecK"
    def __init__(self, data=None, n_clusters=2, n_runs=4, random_state=None, results_parent_folder=None, results_folder=None, results_callback=None, dataset_name=None, verbose=False, template_id=None):
        job_id = f"{I_PecK.name}#{dataset_name}#k{n_clusters}#r{n_runs}#s{random_state}"
        if template_id is not None: job_id = template_id.replace(TEPMLATE_ID_PLACEHOLDER, job_id)
        super().__init__(data=data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means", decision="inertia", random_state=random_state, job_id=job_id, results_parent_folder=results_parent_folder, results_folder=results_folder,
            verbose=verbose, results_callback=results_callback, instance=I_PecK.name
        )


class I_PecKPP(ProgressiveEnsembleClustering):
    """ Inertia Based Progressive Ensemble Kmeans++ """
    name = "I-PecK++"
    def __init__(self, data=None, n_clusters=2, n_runs=4, random_state=None, results_parent_folder=None, results_folder=None, results_callback=None, dataset_name=None, verbose=False, template_id=None):
        job_id = f"{I_PecKPP.name}#{dataset_name}#k{n_clusters}#r{n_runs}#s{random_state}"
        if template_id is not None: job_id = template_id.replace(TEPMLATE_ID_PLACEHOLDER, job_id)
        super().__init__(data=data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means++", decision="inertia", random_state=random_state, job_id=job_id, results_parent_folder=results_parent_folder, results_folder=results_folder,
            verbose=verbose, results_callback=results_callback, instance=I_PecKPP.name
        )
        

class HGPA_PecK(ProgressiveEnsembleClustering):
    """ HGPA Progressive Ensemble Kmeans """
    name = "HGPA-PecK"
    def __init__(self, data=None, n_clusters=2, n_runs=4, random_state=None, results_parent_folder=None, results_folder=None, results_callback=None, dataset_name=None, verbose=False, template_id=None):
        job_id = f"{HGPA_PecK.name}#{dataset_name}#k{n_clusters}#r{n_runs}#s{random_state}"
        if template_id is not None: job_id = template_id.replace(TEPMLATE_ID_PLACEHOLDER, job_id)
        super().__init__(data=data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means", decision="hgpa", random_state=random_state, job_id=job_id, results_parent_folder=results_parent_folder, results_folder=results_folder,
            verbose=verbose, results_callback=results_callback, instance=HGPA_PecK.name
        )


class HGPA_PecKPP(ProgressiveEnsembleClustering):
    """ HGPA Progressive Ensemble Kmeans++ """
    name = "HGPA-PecK++"
    def __init__(self, data=None, n_clusters=2, n_runs=4, random_state=None, results_parent_folder=None, results_folder=None, results_callback=None, dataset_name=None, verbose=False, template_id=None):
        job_id = f"{HGPA_PecKPP.name}#{dataset_name}#k{n_clusters}#r{n_runs}#s{random_state}"
        if template_id is not None: job_id = template_id.replace(TEPMLATE_ID_PLACEHOLDER, job_id)
        super().__init__(data=data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means++", decision="hgpa", random_state=random_state, job_id=job_id, results_parent_folder=results_parent_folder, results_folder=results_folder,
            verbose=verbose, results_callback=results_callback, instance=HGPA_PecKPP.name
        )


class MCLA_PecK(ProgressiveEnsembleClustering):
    """ MCLA Progressive Ensemble Kmeans """
    name = "MCLA-PecK"
    def __init__(self, data=None, n_clusters=2, n_runs=4, random_state=None, results_parent_folder=None, results_folder=None, results_callback=None, dataset_name=None, verbose=False, template_id=None):
        job_id = f"{MCLA_PecK.name}#{dataset_name}#k{n_clusters}#r{n_runs}#s{random_state}"
        if template_id is not None: job_id = template_id.replace(TEPMLATE_ID_PLACEHOLDER, job_id)
        super().__init__(data=data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means", decision="mcla", random_state=random_state, job_id=job_id, results_parent_folder=results_parent_folder, results_folder=results_folder,
            verbose=verbose, results_callback=results_callback, instance=MCLA_PecK.name
        )


class MCLA_PecKPP(ProgressiveEnsembleClustering):
    """ MCLA Progressive Ensemble Kmeans++ """
    name = "MCLA-PecK++"
    def __init__(self, data=None, n_clusters=2, n_runs=4, random_state=None, results_parent_folder=None, results_folder=None, results_callback=None, dataset_name=None, verbose=False, template_id=None):
        job_id = f"{MCLA_PecKPP.name}#{dataset_name}#k{n_clusters}#r{n_runs}#s{random_state}"
        if template_id is not None: job_id = template_id.replace(TEPMLATE_ID_PLACEHOLDER, job_id)
        super().__init__(data=data, n_clusters=n_clusters, n_runs=n_runs, 
            alg="k-means++", decision="mcla", random_state=random_state, job_id=job_id, results_parent_folder=results_parent_folder, results_folder=results_folder,
            verbose=verbose, results_callback=results_callback, instance=MCLA_PecKPP.name
        )


