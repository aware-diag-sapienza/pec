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
let SVG_SILOUETTE;
let previous_computations = [];
let width_rect;
let USED_SEED = []
const SCALE_SILOUHETTE =  d3.scaleLinear().domain([-1,1]).range([0, 1]) 
const LIMIT_IT = 100;



let visualizeMetrics = false;

let verticalLines = []

let ITERAZIONE_PER_MATRICE = 1

function onChangeInputParameter(){
    //document.getElementById('runButton').style.display = "none"
    d3.select('#iteration-label').html('');
}

let variableYAxisLinechart = "globalStability0"
$('#select-variableYAxis-linechart').val(variableYAxisLinechart);
function onChangeVariableYAxisLinechart(){
    variableYAxisLinechart = $( "#select-variableYAxis-linechart" ).val()
    linechart1.updateYAxisVariable()
}
let relatiYAxisLineCharts = document.getElementById('realtiveYScaleLinechart').checked

function changeRelativeYScale(){
    let cbox = document.getElementById('realtiveYScaleLinechart');
    relatiYAxisLineCharts = cbox.checked
    linechart1.updateYAxisVariable()
}

let linechart_Elbow1;
document.getElementById('elbowLinechartCheck').checked = false
let elbowLinechart = document.getElementById('elbowLinechartCheck').checked

function changeElbowLinechart(){
    let cbox = document.getElementById('elbowLinechartCheck');
    elbowLinechart = cbox.checked
    
    if(elbowLinechart){
        linechart_Elbow1 = system.linechartElbow.init('#linechart_inertia')
        let onlyDataActualDataset = previous_computations.filter(d => d.dataset == dataset)

        let elbowData = []
        let allKActualDataset = onlyDataActualDataset.map(d => parseInt(d.cluster)).sort((a, b) => a - b);
        let setK = new Set(allKActualDataset)
        setK.forEach(d=> {
            let value = d3.min(onlyDataActualDataset.filter(ele => ele.cluster == d).map(ele => ele.fastInertia))
            elbowData.push({k: d, value: value})
        })

        linechart_Elbow1.setData(elbowData)
        linechart_Elbow1.render()
    }else{
        linechart1.render()
    }
}

function updateSelects(list_dataset){

    const datasetsArray = list_dataset.map((d)=> d.name)    
    const labelsDataset = list_dataset.map((ld)=> {
        return ld.name.charAt(0).toUpperCase() + ld.name.slice(1) +' n:'+ ld.n + ' d:'+ld.d+' [opt k='+ld.k+']'})
    const tech = ['I-PecK','I-PecK++']//,'HGPA-PecK','HGPA-PecK++','MCLA-PecK','MCLA-PecK++']
    const clusters = [ 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 ]
    const partition = [ 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ]
    const projections = ['tsne','pca']

    $("#select-dataset").empty()
    $("#select-technique").empty()
    $("#select-cluster").empty()
    $("#select-partitions").empty()
    $("#select-projection").val('tsne')

    const selectDataset = document.getElementById('select-dataset');
    const selectTechnique = document.getElementById('select-technique');
    const selectCluster = document.getElementById('select-cluster');
    const selectPartitions = document.getElementById('select-partitions');
    const selectProjections = document.getElementById('select-projection');

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

    for(let i = 0; i < projections.length; i++){
        selectProjections.options.add(new Option(projections[i], projections[i]));
    }

    document.getElementById("select-dataset").value = ""
    document.getElementById("select-technique").value = ""
    document.getElementById("select-cluster").value = ""
    document.getElementById("select-partitions").value = ""
    document.getElementById("select-projection").value = 'tsne'
    document.getElementById("similarity-range").value = 1
    d3.select('#selected_similarity').html($('#similarity-range').val() + '%')
    

}

function resetSelects(){
    document.getElementById("select-dataset").value = ""
    document.getElementById("select-technique").value = ""
    document.getElementById("select-cluster").value = ""
    document.getElementById("select-partitions").value = ""
    document.getElementById("select-projection").value = 'tsne'
    document.getElementById("similarity-range").value = 1
    d3.select('#selected_similarity').html($('#similarity-range').val() + '%')
    
}
function getSeed(){

    let newseed = Math.random()*(100000-1)+1;

    if ($( "#select-seed" ).val() === '')
        return Math.ceil(newseed);
    else 
        return Math.ceil(parseInt($( "#select-seed" ).val()));
}

async function startSelects(){
    LockUI.lock()
    ALL_DATA = []

    ITERAZIONE_PER_MATRICE = 1
    dataset = $( "#select-dataset" ).val()
    technique =  $( "#select-technique" ).val()
    cluster = $( "#select-cluster" ).val()
    partitions = $( "#select-partitions" ).val()
    projection = $( "#select-projection" ).val()
    seed = getSeed()


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
        matrix1 = system.matrixAdjacency.init('#id-matrix-1');
        matrix2 = system.matrixAdjacencyFixed.init('#id-matrix-2');
        linechart1 = system.linechart.init('#linechart_inertia', technique)
        timelinePartitions = system.timelinepartitions.init('#timeline-partitions', technique,partitions)
        
        document.getElementById('elbowLinechartCheck').checked = false
        elbowLinechart = document.getElementById('elbowLinechartCheck').checked

        const job = await SERVER.createAsyncJob(dataset, technique, parseInt(cluster), parseInt(partitions), parseInt(seed))
        JOBS.push(job)
        DATASET_SELECTED = await SERVER.getDataset(dataset);
        job.onPartialResult(result => {

            ALL_DATA.push(result)
            CURRENT_ITERATION = result.iteration
            if(result.iteration == 0){
                LockUI.unlock()
                system.scatterplot.createData(DATASET_SELECTED.projections[projection], result.labels)
            }
            readResult(result)
            d3.select('#iteration-label').html("Iteration " + result.iteration)
        })
        job.start()

        
        addPinHistory()
    } else {
        alert("Select Dataset, technique e clusters to perform the query")
    }
}

let timestamp0;

let swap_timestamp = 0;

function readResult(it_res){
    timestamp0 = swap_timestamp
    let actual_timestamp;
   
    actual_timestamp = it_res.timestamp
    
    d3.select('#iteration-label').html('Iteration #'+it_res.iteration)
    d3.selectAll('.linechart_select').style('display','block')
    d3.select('#button-metric').style('display','block')
    d3.select('#id-metrics').style('display','block')
        if(it_res.iteration === 0){
                
                timestamp0 = it_res.timestamp
                linechart1.setData([it_res]) 
                linechart1.render()
                timelinePartitions.setData([it_res]) 
                timelinePartitions.render()
                updateTable(it_res)
                system.matrixAdjacency.adjacency(partitions,it_res.metrics.partitionsMetrics.adjustedRandScore,it_res.metrics.partitionsMetrics.adjustedMutualInfoScore);
                
        }else{
                linechart1.updateData(it_res,it_res.info)
                timelinePartitions.updateData(it_res,it_res.metrics)
                updateTable(it_res)
                system.scatterplot.updateScatterplot();
                system.matrixAdjacency.updateMatrix(partitions,it_res.metrics.partitionsMetrics.adjustedRandScore,it_res.metrics.partitionsMetrics.adjustedMutualInfoScore);
                
            }
            updatePinHistory(it_res.iteration,it_res.isLast, it_res.metrics.labelsMetrics.simplifiedSilhouette)
            system.matrixAdjacency.updateBestPartition(it_res.info.best_run)

            if (it_res.is_last){
                ITERAZIONE_PER_MATRICE = ITERAZIONE_PER_MATRICE
            } else{
                ITERAZIONE_PER_MATRICE +=1
            }
            
}

function visualizeMetricsFunction(){
    
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
            $('#chE').html(arrotondaNumero(obj.metrics.labelsMetrics.calinskyHarabasz));
            $('#dbE').html(arrotondaNumero(obj.metrics.labelsMetrics.dbIndex));
            $('#diE').html(arrotondaNumero(obj.metrics.labelsMetrics.dunnIndex));
            $('#ineE').html(arrotondaNumero(obj.metrics.labelsMetrics.inertia));
        }
    }

    $('#chC').html(arrotondaNumero(obj.metrics.labelsMetrics.calinskyHarabasz));
    $('#dbC').html(arrotondaNumero(obj.metrics.labelsMetrics.dbIndex));
    $('#diC').html(arrotondaNumero(obj.metrics.labelsMetrics.dunnIndex));
    $('#ineC').html(arrotondaNumero(obj.metrics.labelsMetrics.inertia));

    if(verticalLines.filter(d => d.draw).length>0){
        let chE = Number.parseFloat($("#chE").text());
        let dbE = Number.parseFloat($("#dbE").text());
        let diE = Number.parseFloat($("#diE").text());
        let ineE = Number.parseFloat($("#ineE").text());
        
        $('#chP').html(computeRatioPerc(obj.metrics.labelsMetrics.calinskyHarabasz, chE));
        $('#dbP').html(computeRatioPerc(obj.metrics.labelsMetrics.dbIndex, dbE));
        $('#diP').html(computeRatioPerc(obj.metrics.labelsMetrics.dunnIndex, diE));
        $('#ineP').html(computeRatioPerc(obj.metrics.labelsMetrics.inertia, ineE));
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
    let margin_history = {top: 5, bottom:10, left:20, right:20}
    let height_pin = 60;

    if (SVG_HISTORY == undefined){
        SVG_HISTORY = d3.select("#listhistory")
            .append("svg")
            .attr('width',width_history)
            .attr('height', height_history)
            .append("g")
            .attr('width',width_history)
            .attr('height', height_history-margin_history.top-margin_history.bottom)
            .attr("transform","translate(" + margin_history.top + "," + margin_history.left + ")")

        
    }

    let tentative = previous_computations.length

    previous_computations.push({'dataset':dataset, 'technique':technique, 'cluster':cluster, 'partitions':partitions, 'tentative': tentative, 'seed':seed, 'simplifiedSilhouette':-1, 'iteration':0, 'earlyTerminationslow':-1, 'slowInertia': -1, 'earlyTerminationfast':-1, 'fastInertia':-1})

    scaleHistory = d3.scaleBand()
       
    SVG_HISTORY.selectAll(".bar-history")
        .data(previous_computations)
        .enter()
        .append('rect')
        .attr('class','bar-history')
        .attr('id',(d) => 'background-' + d.tentative)
        .attr('x', 0)
        .attr('y', (d)=> {return (d.tentative*(height_pin+4))})
        .attr('width', width_history-margin_history.right)
        .attr('height', height_pin)
        .attr('stroke', 'black')
        .attr('fill', 'white')
    
    
    /*SVG_SILOUETTE.selectAll(".bar-silouette")
        .data(previous_computations)
        .enter()
        .append('rect')
        .attr('class','bar-silouette')
        .attr('id',(d) => 'silouette-' + d.tentative)
        .attr('x', 0)
        .attr('y', (d)=> {return (d.tentative*(height_pin+4))})
        .attr('width', 200)
        .attr('height', height_pin)
        .attr('stroke', 'black')
        .attr('fill', 'pink')*/
    width_rect = (width_history-margin_history.right)/LIMIT_IT

    SVG_HISTORY.selectAll(".bar-history-improvement")
        .data(previous_computations)
        .enter()
        .append('rect')
        .attr('class','bar-history-improvement')
        .attr('id',(d) => 'improvement-' + d.tentative)
        .attr('x', 0)
        .attr('y', (d)=> {return (d.tentative*(height_pin+4))})
        .attr('width', 0)
        .attr('height', height_pin)
        .attr('fill', '#afeeee')

    let text = SVG_HISTORY.selectAll(".text-history")
        .data(previous_computations)
        .enter()
        .append('text')
        .attr('class','text-history')
        .attr('x', 3)
        .attr('y', (d)=> {return (d.tentative*(height_pin+4))+15})
        //.text((d)=> {return d.dataset})

        text.append("tspan")
            .text(d => d.dataset)
            .attr("class", "tspan-dataset")
            .attr("x", 0)
            .attr("dx", 10)
            .attr("dy", 2)
            .attr('font-size', 'smaller')
        
        text.append("tspan")
            .text(d => 'K:' + d.cluster + ' P:' + d.partitions)
            .attr("class", "tspan-cluster")
            .attr("x", 0)
            .attr("dx", 10)
            .attr("dy", 12)
            .attr('font-size', 'smaller')
        
        text.append("tspan")
            .text(d => d.technique)
            .attr("class", "tspan-technique")
            .attr("x", 0)
            .attr("dx", 10)
            .attr("dy", 12)
            .attr('font-size', 'smaller')
        
        text.append("tspan")
            .text(d => 'S:' +d.seed)
            .attr("class", "tspan-seed")
            .attr("x", 0)
            .attr("dx", 10)
            .attr("dy", 12)
            .attr('font-size', 'smaller')
    
        SVG_HISTORY.selectAll(".bar-silouette")
            .data(previous_computations)
            .enter()
            .append('rect')
            .attr('class','bar-silouette')
            .attr('id',(d) => 'silouette-' + d.tentative)
            .attr('x', width_history-margin_history.right)
            .attr('y', (d)=> {return (d.tentative*(height_pin+4))})
            .attr('width', 10)
            .attr('height', height_pin)
            .attr('stroke', 'black')
            .attr('fill', (d) => d3.interpolateReds(SCALE_SILOUHETTE(d.simplifiedSilhouette)))
        }

function updatePinHistory(iteration,isLast,valore_silouette){

    //previous_computations.length
    let current_computation_index = previous_computations.length-1


    previous_computations[current_computation_index]['simplifiedSilhouette'] = valore_silouette

    d3.select('#silouette-' + current_computation_index)
        .attr('fill', (d) => d3.interpolateReds(SCALE_SILOUHETTE(d.simplifiedSilhouette)))
    
    if(isLast){
        d3.select('#improvement-'+(current_computation_index))
        .attr('width',width_rect*LIMIT_IT)
        
    } else {
        d3.select('#improvement-'+(current_computation_index))
        .attr('width',width_rect*iteration)
    }

}      

function updateProjection(){
    let last_it = ALL_DATA.length -1
    projection = $( "#select-projection" ).val()
    system.scatterplot.createDataProjection(DATASET_SELECTED.projections[projection], ALL_DATA[last_it].labels)
}