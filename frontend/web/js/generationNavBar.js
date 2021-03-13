let dataset; 
let technique;
let cluster;
let partitions;
var seed = 0;
let linechart1;
let timelinePartitions;
let matrix1;
let matrix2;
let SVG_HISTORY;
let previous_computations = [];

let visualizeMetrics = false;

let verticalLines = []

let ITERAZIONE_PER_MATRICE = 1

function onChangeInputParameter(){
    //document.getElementById('runButton').style.display = "none"
    d3.select('#iteration-label').html('');
}

function updateSelects(list_dataset){

    const datasetsArray = list_dataset.map((d)=> d.name)    
    const labelsDataset = list_dataset.map((ld)=> {
        return ld.name.charAt(0).toUpperCase() + ld.name.slice(1) +' n:'+ ld.n + ' d:'+ld.d+' [opt k='+ld.k+']'})
    const tech = ['I-PecK','I-PecK++','HGPA-PecK','HGPA-PecK++','MCLA-PecK','MCLA-PecK++']
    const clusters = [ 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 ]
    const partition = [ 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ]

    $("#select-dataset").empty()
    $("#select-technique").empty()
    $("#select-cluster").empty()
    $("#select-partitions").empty()

    const selectDataset = document.getElementById('select-dataset');
    const selectTechnique = document.getElementById('select-technique');
    const selectCluster = document.getElementById('select-cluster');
    const selectPartitions = document.getElementById('select-partitions');

    for(let i = 0; i < datasetsArray.length; i++){
        selectDataset.options.add(new Option(labelsDataset[i], datasetsArray[i]));
    }

    for(let i = 0; i < tech.length; i++){
        selectTechnique.options.add(new Option(tech[i], tech[i]));
    }

    for(let i = 0; i < clusters.length; i++){
        selectCluster.options.add(new Option(clusters[i], clusters[i]));
    }

    for(let i = 0; i < partition.length; i++){
        selectPartitions.options.add(new Option(partition[i], partition[i]));
    }

    document.getElementById("select-dataset").value = ""
    document.getElementById("select-technique").value = ""
    document.getElementById("select-cluster").value = ""
    document.getElementById("select-partitions").value = ""

}

function resetSelects(){
    document.getElementById("select-dataset").value = ""
    document.getElementById("select-technique").value = ""
    document.getElementById("select-cluster").value = ""
    document.getElementById("select-partitions").value = ""
}

async function startSelects(){

    ITERAZIONE_PER_MATRICE = 1
    dataset = $( "#select-dataset" ).val()
    technique =  $( "#select-technique" ).val()
    cluster = $( "#select-cluster" ).val()
    partitions = $( "#select-partitions" ).val()
    seed = 0

    d3.select('#iteration-label').html('');
    d3.select('#id-metrics').style('display','none');
   
    $('#chC').html('-');
    $('#dbC').html('--');
    $('#diC').html('--');
    $('#ineC').html('--');
    $('#chE').html('-');
    $('#dbE').html('--');
    $('#diE').html('--');
    $('#ineE').html('--');

    $('#chP').html('-');
    $('#dbP').html('--');
    $('#diP').html('--');
    $('#ineP').html('--');

    if (dataset != null && technique != null && cluster != null){
        linechart1 = system.linechart.init('#linechart_inertia', technique)
        timelinePartitions = system.timelinepartitions.init('#timeline-partitions', technique,partitions)
        matrix1 = system.matrixAdjacency.init('#id-matrix-1');
        matrix2 = system.matrixAdjacencyFixed.init('#id-matrix-2');

        const job = await SERVER.createAsyncJob(dataset, technique, parseInt(cluster), parseInt(partitions), parseInt(seed))
        DATASET_SELECTED = await SERVER.getDataset(dataset);
        job.onPartialResult(result => {
            if (result.iteration == 1){
                system.scatterplot.createData(DATASET_SELECTED.projections.tsne, result.labels)
            }

            if (result.iteration >= 1){
                // sono alla prima iterazione e devo creare il lo scatterplot.             
                readResult(result)
                d3.select('#iteration-label').html("")
                d3.select('#information-info').html("Early Termination")
                
            }
        })

        job.start()
        addPinHistory()
    } else {
        alert("Select Dataset, technique e clusters to perform the query")
    }
}

// questa non pen so che serva più
async function startIterations(){
    console.log(dataset)
    if(dataset == $( "#select-dataset" ).val()){
        readFile(1);
        
        d3.select('#iteration-label').html("")
        d3.select('#information-info').html("Early Termination")
        addPinHistory()
    } else {
        alert("Click START")
    }

    
}

let timestamp0;

let swap_timestamp = 0;



function readResult(it_res){
    timestamp0 = swap_timestamp
    let actual_timestamp;
    console.log('sono in readFile',it_res)

    actual_timestamp = it_res.timestamp

    console.log('SONO ALL\'iTERAZIONE  ',it_res.iteration)
    
    d3.select('#iteration-label').html('Iteration #'+it_res.iteration)
    d3.select('#button-metric').style('display','block')
    d3.select('#id-metrics').style('display','block')
        
        if(it_res.iteration == 1){
                console.log('RISULTATO',it_res)
                timestamp0 = it_res.timestamp
                linechart1.setData([it_res]) 
                linechart1.render()
                timelinePartitions.setData([it_res.metrics]) 
                timelinePartitions.render()
                updateTable(it_res.info)
                system.matrixAdjacency.adjacency(partitions,it_res.info.runs_ars_matrix,it_res.info.runs_ami_matrix);
        }else{
                linechart1.updateData(it_res,it_res.info)
                timelinePartitions.updateData(it_res.metrics,it_res.metrics)
                updateTable(it_res.info)
                system.scatterplot.updateScatterplot(false,it_res.labels);
                system.matrixAdjacency.updateMatrix(partitions,it_res.info.runs_ars_matrix,it_res.info.runs_ami_matrix);
        }

            if (it_res.is_last){
                ITERAZIONE_PER_MATRICE = ITERAZIONE_PER_MATRICE
            } else{
                ITERAZIONE_PER_MATRICE +=1
            }
            
}

function visualizeMetricsFunction(){
    console.log('voglio visualizzare')
    if(!visualizeMetrics){
        d3.select('#table-metrics').style('display','block')
        d3.select('.metrics-dropdown').style('border-width','2px')
        visualizeMetrics = true;
    } else {
        d3.select('#table-metrics').style('display','none')
        d3.select('.metrics-dropdown').style('border-width','0px')
        visualizeMetrics = false;
    }
    
}

function updateTable(obj){
    for(let i=0; i<verticalLines.length; i++){
        let d = verticalLines[i]
        if(d.draw && d.iteration==obj.iteration) {
            $('#chE').html(arrotondaNumero(obj.calinsky_harabaz));
            $('#dbE').html(arrotondaNumero(obj.db_index));
            $('#diE').html(arrotondaNumero(obj.dunn_index));
            $('#ineE').html(arrotondaNumero(obj.inertia));
        }
    }

    $('#chC').html(arrotondaNumero(obj.calinsky_harabaz));
    $('#dbC').html(arrotondaNumero(obj.db_index));
    $('#diC').html(arrotondaNumero(obj.dunn_index));
    $('#ineC').html(arrotondaNumero(obj.inertia));

    if(verticalLines.filter(d => d.draw).length>0){
        let chE = Number.parseFloat($("#chE").text());
        let dbE = Number.parseFloat($("#dbE").text());
        let diE = Number.parseFloat($("#diE").text());
        let ineE = Number.parseFloat($("#ineE").text());
        
        $('#chP').html(computeRatioPerc(obj.calinsky_harabaz, chE));
        $('#dbP').html(computeRatioPerc(obj.db_index, dbE));
        $('#diP').html(computeRatioPerc(obj.dunn_index, diE));
        $('#ineP').html(computeRatioPerc(obj.inertia, ineE));
    }
}

function arrotondaNumero(numb){
    return Number.parseFloat(numb).toFixed(4)
}

function computeRatioPerc(final,initial){
    return Math.abs(Number.parseFloat( (1 - Number.parseFloat(initial).toFixed(4)/Number.parseFloat(final).toFixed(4)) * 100 ).toFixed(4))
}

function addPinHistory() {
    let width_history = $("#listhistory").width()
    let height_history = $("#listhistory").height()
    let margin_history = {top: 10, bottom:10, left:20, right:20}

    if (SVG_HISTORY == undefined){
        SVG_HISTORY = d3.select("#listhistory")
            .append("svg")
            .attr('width',width_history)
            .attr('height', height_history)
            .append("g")
            .attr('width',width_history-margin_history.left-margin_history.right)
            .attr('height', height_history-margin_history.top-margin_history.bottom)
            .attr("transform","translate(" + margin_history.top + "," + margin_history.left + ")")    
    }

    let tentative = previous_computations.length

    previous_computations.push({'dataset':dataset, 'technique':technique, 'cluster':cluster, 'partitions':partitions, 'tentative': tentative})
    console.log('-+-+-+-+-+-+-+-',previous_computations,dataset,technique ,cluster ,partitions, tentative)
    
    SVG_HISTORY.selectAll(".bar-history")
        .data(previous_computations)
        .enter()
        .append('rect')
        .attr('class','bar-history')
        .attr('x', 0)
        .attr('y', (d)=> {return (d.tentative*54)})
        .attr('width', width_history-margin_history.right)
        .attr('height', (d)=>{return 50})
        .attr('stroke', 'black')
        .attr('fill', '#69a3b2')
    
    let text = SVG_HISTORY.selectAll(".text-history")
        .data(previous_computations)
        .enter()
        .append('text')
        .attr('class','text-history')
        .attr('x', 3)
        .attr('y', (d)=> {return (d.tentative*54)+15})
        //.text((d)=> {return d.dataset})

        text.append("tspan")
            .text(d => d.dataset)
            .attr("class", "tspan-dataset")
            .attr("x", 0)
            .attr("dx", 10)
            .attr("dy", 2)
            .attr('font-size', 'smaller')
        
        text.append("tspan")
            .text(d => 'K: ' + d.cluster)
            .attr("class", "tspan-cluster")
            .attr("x", 0)
            .attr("dx", 10)
            .attr("dy", 12)
            .attr('font-size', 'smaller')
        
        text.append("tspan")
            .text(d => {
                if(d.technique == 'inertia-kmeans')
                    return 'inertia';
                if(d.technique == 'inertia-kmeans++')
                    return 'inertia ++';
                if(d.technique == 'hgpa-kmeans')
                    return 'hgpa';
                if(d.technique == 'hgpa-kmeans++')
                    return 'hgpa ++';
                if(d.technique == 'mcla-kmeans')
                    return 'mcla';
                if(d.technique == 'mcla-kmeans++')
                    return 'mcla ++';
                
                })
            .attr("class", "tspan-technique")
            .attr("x", 0)
            .attr("dx", 10)
            .attr("dy", 12)
            .attr('font-size', 'smaller')
        
        


    


    console.log('-+-+-+-+-+-+-+-',previous_computations,dataset,technique ,cluster ,partitions)
    //dataset-technique-cluster-partitions
}