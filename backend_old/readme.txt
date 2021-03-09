Installare le dipendenze: 'pip3 install -r requirements.py'

Unzip 'data.zip' , dovrebbe creare una cartella 'data'

Launch: 
  python3 server.py 1234

Endpoints:
  http://localhost:1234/ -->> Lista di dataset disponibili, con:
    - tecnica (inertia-kmeans, inertia-kmeans++, hgpa-kmeans, hgpa-kmeans++, mcla-kmeans, mcla-kmeans++)
    - k
    - r

  http://localhost:1234/wine ---> csv del dataset

  http://localhost:1234/wine/hgpa-kmeans/k2/r16/it0 -->
    informazioni relative a hgpa-kmeans con k2, r16, per l'iterazione it0
    ritorna un json, l'attributo is_last dice se quella è l'ultima iterazione, così da fermarare il coclo di lettura
    l'idice delle iterazione parte da 0 (it0, it1, it2)
  


Per early termination in 
  inertia-based : vedere la prima volta in cui inertia_improvement_gradient <= (fast 10^-4) , (medium 10^-5),  (slow 10^-6)
  hgpa, mcla : stesso approccio ma usare ami_gradient e/o ars_gradient



