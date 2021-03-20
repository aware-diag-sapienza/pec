if (window.system == undefined) window.system = {}
system.initialization = (function() {
    const that = this;
    this.current_ranking = null

    // variable
    //this.nomevariale

    //function
    //this.nomefunzione = () =>{}
    let linechart1;
    let partitions;
    let matrix1;
    let matrix2;

    this.start = ()=> {
        Promise.all([
          d3.json("./web/js/timeseries_linechart.json"),
        ]).then(function(files) {

          linechart1 = system.linechart.init('#linechart_inertia')
          
          partitions = system.partitions.init('#timeline-partitions')

          const data = files[0]
          const sleepNow = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
          async function repeatedGreetingsLoop(){
            for (let i = 0; i<data.length ; i++){
              await sleepNow(1500)
              if(i == 0){
                linechart1.setData([data[i]]) 
                linechart1.render()
                
              }else{
                linechart1.updateData(data[i])
                if(i == 3 || i == 8 || i == 10 || i == 15) 
                  system.scatterplot.updateScatterplot();
                else 
                  system.scatterplot.updateScatterplot();
              }
            }
          }

          repeatedGreetingsLoop()
         })
        

        //matrix1 = system.matrixAdjacency.init('#id-matrix-1');
        //system.matrixAdjacency.adjacency();

        //matrix2 = system.matrixAdjacencyFixed.init('#id-matrix-2');
        //system.matrixAdjacencyFixed.adjacency('#id-matrix-2');
        console.log('matrix1', )
        
        
    }

    this.update = ()=> {
      /*const obj = { 
        "event": "iteration",
        "jobId": "asdfghjkl",
        
        "timestamp": 0.10, 
        "iteration": 15, 
        "inertia": 700.00, 
        "inertiaImprovement": 0.00, 
        "inertiaImprovementGradient": 0.00, 
        "labels": [], 
        "partitionsSimilarity": [[]], 
        "bestPartition": 5, 
    
        "earlyTerminationStrict": false, 
        "earlyTerminationSlow": true, 
        "earlyTerminationMedium": true, 
        "earlyTerminationFast": true 
      }
      linechart1.updateData(obj)
      linechart1.prova()*/
    }

    return this;
}).call({})