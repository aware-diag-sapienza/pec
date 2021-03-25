let dataset; 
let technique;
let cluster;
let partitions;
let stability_window;
var seed = 0;
let linechart1;
let timelinePartitions;
let similarity_metric_matrix;
let matrix1;
let matrix2;
let SVG_HISTORY;
let SVG_SILOUETTE;
let previous_computations = [];
let width_rect;
let USED_SEED = []
const SCALE_SILOUHETTE =  d3.scaleLinear().domain([0,1]).range([0, 1]) 
const LIMIT_IT = 100;
let CURRENT_HISTORY = 0;



let visualizeMetrics = false;

let verticalLines = []

let ITERAZIONE_PER_MATRICE = 1

function onChangeInputParameter(){
    d3.select('#iteration-label').html('');
}

let variableYAxisLinechart = "2"
/* VECCHIO SELECT SOPRA LINECHART
$('#select-variableYAxis-linechart').val(variableYAxisLinechart);
function onChangeVariableYAxisLinechart(){
    variableYAxisLinechart = $( "#select-variableYAxis-linechart" ).val()
    linechart1.updateYAxisVariable()
}*/
let relatiYAxisLineCharts = document.getElementById('realtiveYScaleLinechart').checked

function changeRelativeYScale(){
    let cbox = document.getElementById('realtiveYScaleLinechart');
    relatiYAxisLineCharts = cbox.checked
    linechart1.updateYAxisVariable()
}

let linechart_Elbow1;
document.getElementById('elbowLinechartCheck').checked = false
let elbowLinechart = document.getElementById('elbowLinechartCheck').checked
/*
VECCHIA VERSIONE GUIDATA DA UTENTE
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
}*/

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

d3.selectAll('.elbowParameter').style('display','none')

function startComputation(){
    if(elbowLinechart){
        d3.selectAll('.elbowParameter').style('display','block')
        startElbow()
    }else{
        d3.selectAll('.elbowParameter').style('display','none')
        startSelects()
    }
}

function changeElbowLinechart(){
    let cbox = document.getElementById('elbowLinechartCheck');
    elbowLinechart = cbox.checked
    if(elbowLinechart){
        d3.selectAll('.elbowParameter').style('display','block')
        if(linechart_Elbow1 !== undefined) linechart_Elbow1.render()
    }else{
        d3.selectAll('.elbowParameter').style('display','none')
        if(linechart1 !== undefined) linechart1.render()
    }
    
}
let elbowJob = null
async function startElbow(){
    LockUI.lock()
        
    let elbowData = []
    const dname = $( "#select-dataset" ).val()
    const kMin = parseInt($( "#select-minK-Elbow" ).val())
    const kMax = parseInt($( "#select-maxK-Elbow" ).val())
    const r = parseInt($( "#select-partitions" ).val())
    const seed = parseInt(getSeed())
    const type = $( "#select-technique" ).val() // I-PecK++ HGPA-Peck HGPA-Peck++ (come chiamati sul paper)
    let etElbow = $( "#typeElbow" ).val()
    if(etElbow == "null") etElbow = null
    const earlyTermination = etElbow //null, "fast", "slow"
      
    if (dname != null && type != null && kMin != null && kMax != null && r != null && kMin<kMax){
        elbowJob = await SERVER.createElbowJob (dname, type, kMin, kMax, r, seed, earlyTermination)

        linechart_Elbow1 = system.linechartElbow.init('#linechart_inertia', kMin, kMax)
        elbowJob.onPartialResult(result => {
            if(result.k == 2){
                LockUI.unlock()
            }
            elbowData.push({k: result.k, value: result.inertia})
            linechart_Elbow1.setData(elbowData)
            linechart_Elbow1.render()
        })
        elbowJob.start()
    } else {
        alert("Select Dataset, technique, k range, partitions and early termination")
        LockUI.unlock()
    }  
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
    d3.select('#select-seed').attr('placeholder',seed)
    d3.select('#iteration-label').html('');
    d3.select('#id-metrics').style('display','none');

    stability_window = $('#select-window').val()
    similarity_metric_matrix= $('#select-similarity-matrix').val()
    average_similarity_metric_matrix = 'averageA'+similarity_metric_matrix.substring(1)
    
   
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
        d3.select('#info-scatterplot-1').style('visibility','visible');
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
    d3.select('#button-metric').style('display','inline')
    d3.select('#id-metrics').style('display','flex')
        if(it_res.iteration === 0){
                timestamp0 = it_res.timestamp
                linechart1.setData([it_res]) 
                linechart1.render()
                timelinePartitions.setData([it_res]) 
                timelinePartitions.render()
                updateTable(it_res)
                system.matrixAdjacency.adjacency(partitions,it_res.metrics.partitionsMetrics[similarity_metric_matrix],it_res.metrics.partitionsMetrics[average_similarity_metric_matrix]); 
        }else{
                linechart1.updateData(it_res,it_res.info)
                timelinePartitions.updateData(it_res,it_res.metrics)
                updateTable(it_res)
                system.scatterplot.updateScatterplot();
                system.matrixAdjacency.updateMatrix(partitions,it_res.metrics.partitionsMetrics[similarity_metric_matrix],it_res.metrics.partitionsMetrics[average_similarity_metric_matrix]); 
            }
            updatePinHistory(it_res.iteration,it_res.isLast, it_res.metrics.labelsMetrics.simplifiedSilhouette)
            system.matrixAdjacency.updateBestPartition(it_res.info.best_run)
            if (it_res.is_last){
                ITERAZIONE_PER_MATRICE = ITERAZIONE_PER_MATRICE
            } else{
                ITERAZIONE_PER_MATRICE +=1
            }
}


function readHistoryResult(li_data,all_data,job, slowData, fastData){
    
    timestamp0 = swap_timestamp
    let actual_timestamp;
    actual_timestamp = li_data.timestamp

    matrix1 = system.matrixAdjacency.init('#id-matrix-1');
    matrix2 = system.matrixAdjacencyFixed.init('#id-matrix-2');
    linechart1 = system.linechart.init('#linechart_inertia', technique)
    timelinePartitions = system.timelinepartitions.init('#timeline-partitions', technique,partitions)
    

    d3.select('#info-scatterplot-1').style('visibility','visible');
    document.getElementById('elbowLinechartCheck').checked = false
    elbowLinechart = document.getElementById('elbowLinechartCheck').checked

    d3.select('#iteration-label').html('Iteration #'+li_data.iteration)
    d3.selectAll('.linechart_select').style('display','block')
    d3.select('#button-metric').style('display','inline')
    d3.select('#id-metrics').style('display','flex')
    linechart1.setData(all_data) 
    
    timelinePartitions.setData(all_data) 
    system.timelinepartitions.partitions_status = job.partitions_status
    system.timelinepartitions.DOMAINS = job.DOMAINS
    system.timelinepartitions.ITERATION_LAST = job.ITERATION_LAST
    if (system.timelinepartitions.metric_value === 'inertia'){
        system.timelinepartitions.colorScaleCell = d3.scaleLinear()
            .range([1,0])
            .domain([system.timelinepartitions.DOMAINS[system.timelinepartitions.metric_value][0], system.timelinepartitions.DOMAINS[system.timelinepartitions.metric_value][1]])
        }
    if (system.timelinepartitions.metric_value === system.timelinepartitions.METRICA_LABELING) {
        system.timelinepartitions.colorScaleCell = d3.scaleLinear()
            .range([0,1])
            .domain([system.timelinepartitions.DOMAINS[system.timelinepartitions.metric_value][0], system.timelinepartitions.DOMAINS[system.timelinepartitions.metric_value][1]])
    }

    timelinePartitions.render()
    updateTable(li_data)
    system.matrixAdjacency.adjacency(partitions,li_data.metrics.partitionsMetrics[similarity_metric_matrix],li_data.metrics.partitionsMetrics[average_similarity_metric_matrix]); 
    system.scatterplot.updateScatterplot(); 
    system.matrixAdjacency.updateBestPartition(li_data.info.best_run)
    system.scatterplot.early_termination = null;
    linechart1.updateEarlyTerminationFromHistory(slowData)
    linechart1.updateEarlyTerminationFromHistory(fastData)

    linechart1.render()
}

function visualizeMetricsFunction(){
    
    if(!visualizeMetrics){
        d3.select('#table-metrics').style('display','inline')
        //d3.select('.metrics-dropdown').style('border-width','2px')
        visualizeMetrics = true;
    } else {
        d3.select('#table-metrics').style('display','none')
        //d3.select('.metrics-dropdown').style('border-width','0px')
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

    function colorPin(){
        if (previous_computations.length === 1){
            // sono alla prima iterazione e restituisco il verde chiaro
            return '#a6c6a5';
        } else {
            let current_index = previous_computations.length -1
            let previous_index = previous_computations.length -2

            if ((previous_computations[current_index]['technique']!== previous_computations[previous_index]['technique']) && (previous_computations[current_index]['partitions']!== previous_computations[previous_index]['partitions']))
                return '#ca96d0' // lilla
            if (previous_computations[current_index]['technique']!== previous_computations[previous_index]['technique'])
                return '#afeeee' // azzurro
            if (previous_computations[current_index]['partitions']!== previous_computations[previous_index]['partitions'])
                return '#f1ac7f' // pesca
            
            return '#a6c6a5' // verde
        }   
    }
function addPinHistory() {
    // SE IL dataset selezionato non è nella struttura dati presente allora riazzero l'svg e lla struttura dati. 
    if (previous_computations.map(d=> d.dataset).indexOf(dataset)=== -1){
        d3.select("#svg-list-history").remove('*');
        d3.select('#name-dataset-history').remove('*');
        previous_computations = [];
        SVG_HISTORY = null
        CURRENT_HISTORY = 0;
    } 

    let width_history = $("#listhistory").width()
    let height_history = $("#listhistory").height()
    let margin_history = {top: 1, bottom:10, left:5, right:25}
    let height_pin = 60;

    if (SVG_HISTORY == null){
        d3.select("#listhistory").append('p')
        .attr('id', 'name-dataset-history')
        .style('padding-left','10px')
        .html(dataset)
        SVG_HISTORY = d3.select("#listhistory")
            .append("svg")
            .attr("id","svg-list-history")
            .attr('width',width_history)
            .attr('height', height_history)
            .append("g")
            .attr('width',width_history)
            .attr('height', height_history-margin_history.top-margin_history.bottom)
            .attr("transform","translate(" + margin_history.left + "," + margin_history.top + ")")
            
    }

    let tentative = previous_computations.length
    CURRENT_HISTORY = tentative;

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
        .attr('stroke-width', '1')
        .attr('fill', 'white')
    
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
        .attr('fill', colorPin())
       


    SVG_HISTORY.selectAll(".bar-history-early-slow")
        .data(previous_computations)
        .enter()
        .append('rect')
        .attr('class','bar-history-early-slow')
        .attr('id',(d) => 'early-slow-' + d.tentative)
        .attr('x', 0)
        .attr('y', (d)=> {return (d.tentative*(height_pin+4))})
        .attr('width', 0)
        .attr('height', height_pin)
        .attr('fill', '#c0c0c0')

        SVG_HISTORY.selectAll(".bar-history-early-fast")
        .data(previous_computations)
        .enter()
        .append('rect')
        .attr('class','bar-history-early-fast')
        .attr('id',(d) => 'early-fast-' + d.tentative)
        .attr('x', 0)
        .attr('y', (d)=> {return (d.tentative*(height_pin+4))})
        .attr('width', 0)
        .attr('height', height_pin)
        .attr('fill', '#ffd700')
    
        //    .attr("data-tippy-content", d => "Early Termination Fast \nat iteration " + d.iteration)  
    //tippy(hetf.nodes(),{delay: 300,placement: 'right', arrow:false});
    
    let text = SVG_HISTORY.selectAll(".text-history")
        .data(previous_computations)
        .enter()
        .append('text')
        .attr('class','text-history')
        .attr('x', 3)
        .attr('y', (d)=> {return (d.tentative*(height_pin+4))+15})
        //.text((d)=> {return d.dataset})

        /*text.append("tspan")
            .text(d => d.dataset)
            .attr("class", "tspan-dataset")
            .attr("x", 0)
            .attr("dx", 10)
            .attr("dy", 2)
            .attr('font-size', 'smaller')*/
        
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
        
        /*text.append("tspan")
            .text(d => 'S:' +d.seed)
            .attr("class", "tspan-seed")
            .attr("x", 0)
            .attr("dx", 10)
            .attr("dy", 12)
            .attr('font-size', 'smaller')*/
    
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
        
        SVG_HISTORY.selectAll(".bar-border")
            .data(previous_computations)
            .enter()
            .append('rect')
            .attr('class','bar-border')
            .attr('id',(d) => 'border-' + d.tentative)
            .attr('x', 0)
            .attr('y', (d)=> {return (d.tentative*(height_pin+4))})
            .attr('width', width_history-margin_history.right + 10)
            .attr('height', height_pin)
            .attr('stroke', 'black')
            .attr('stroke-width',1)
            .attr('fill','transparent')
            .on('click',function (element,d) {
                console.log(d)
                d3.selectAll('.bar-border').attr('stroke-width', '1')
                d3.select('#border-'+d.tentative).attr('stroke-width', '2')
                uploadPreviousData(d,JOBS[d.tentative])
            })
            .on("mouseover", function(event,i) {
                console.log(event)
                let div = d3.select('#history-tooltip')
                div.transition()		
                    .duration(200)		
                    .style("opacity", 1);		
                div.html( "Seed "+ previous_computations[i.tentative].seed+"<br/> Simplified Silhouette "+ previous_computations[i.tentative].simplifiedSilhouette.toFixed(4))	
                    .style("left", (event.clientX) + "px")		
                    .style("top", (event.clientY - 28) + "px");	
                })					
            .on("mouseout", function(d,i) {	
                let div = d3.select('#history-tooltip')	
                div.transition()		
                    .duration(500)		
                    .style("opacity", 0);	
            });
            
        }

function updatePinHistory(iteration,isLast,valore_silouette){
    let CURRENT_HISTORY = previous_computations.length-1
    previous_computations[CURRENT_HISTORY]['simplifiedSilhouette'] = valore_silouette
    previous_computations[CURRENT_HISTORY]['iteration'] = iteration

    SVG_HISTORY.selectAll(".bar-silouette").data(previous_computations)
    SVG_HISTORY.selectAll(".bar-history-improvement").data(previous_computations)

    d3.select('#silouette-' + CURRENT_HISTORY)
        .attr('fill', (d) => d3.interpolateReds(SCALE_SILOUHETTE(d.simplifiedSilhouette)))
    
    if(isLast){
        d3.select('#improvement-'+(CURRENT_HISTORY))
        .attr('width',width_rect*LIMIT_IT)
        let width_iteration = (width_rect*LIMIT_IT)/iteration
            // ho trovato la early termination slow 
            d3.select('#early-slow-'+CURRENT_HISTORY)
                .attr('width',5)
                .attr('x',width_iteration*previous_computations[CURRENT_HISTORY]['earlyTerminationslow']+5)
            // ho trovato la early termination fast 
            d3.select('#early-fast-'+CURRENT_HISTORY)
                .attr('width',5)
                .attr('x',width_iteration*previous_computations[CURRENT_HISTORY]['earlyTerminationslow'])
    } else {
        d3.select('#improvement-'+(CURRENT_HISTORY))
            .attr('width',width_rect*iteration)

        if (previous_computations[CURRENT_HISTORY]['earlyTerminationslow'] === iteration){
            // ho trovato la early termination slow 
            d3.select('#early-slow-'+CURRENT_HISTORY)
            .attr('width',5)
            .attr('x',width_rect*iteration+5)
        }

        if (previous_computations[CURRENT_HISTORY]['earlyTerminationfast'] === iteration){
            // ho trovato la early termination fast 
            d3.select('#early-fast-'+CURRENT_HISTORY)
            .attr('width',5)
            .attr('x',width_rect*iteration)
        }

        

    }

    let hetf = d3.selectAll(".bar-history-early-fast")
        .data(previous_computations)
        .attr("data-tippy-content", d => "Early Termination Fast \nat iteration " + d.earlyTerminationfast)  
        tippy(hetf.nodes(),{delay: 300,placement: 'right', arrow:false});
    
    let hets = d3.selectAll(".bar-history-early-slow")
    .data(previous_computations)
        .attr("data-tippy-content", d => "Early Termination Slow \nat iteration " + d.earlyTerminationslow)  
        tippy(hets.nodes(),{delay: 300,placement: 'right', arrow:false});
    
    let sil = d3.selectAll(".bar-silouette")
        .data(previous_computations)
        .attr("data-tippy-content", d => "Simplified Silouette\n " + d.simplifiedSilhouette.toFixed(4))  
        tippy(sil.nodes(),{delay: 300,placement: 'right', arrow:false});

}      

function updateProjection(){
    let last_it = ALL_DATA.length -1
    projection = $( "#select-projection" ).val()
    system.scatterplot.createDataProjection(DATASET_SELECTED.projections[projection], ALL_DATA[last_it].labels)
}

function updateEarlyTermination(){
    
    // togliere la selezione dalla timeline
    d3.selectAll('rect.rect-partition')
        .attr('width', system.timelinepartitions.xScale.bandwidth()*0.90)
        .attr('height',system.timelinepartitions.yScale.bandwidth()*0.70)
    
    // far vedere lo scatterplot della early termination
    let index = previous_computations.length -1
    let iterationFast = +previous_computations[index].earlyTerminationfast
    
    d3.select('#information-info').html("Early Termination Fast - Iteration #" + iterationFast + '   <b>ARI<b/>: ' + ALL_DATA[iterationFast].metrics.progressiveMetrics.adjustedRandScore.toFixed(4))
    system.scatterplotFixed.updateScatterplot(false,true, system.scatterplot.scale_x,system.scatterplot.scale_y,system.scatterplot.LABEL_EARLY_TERMINATION);

}

function changeStabilityWindow(){
    stability_window = $('#select-window').val()
    system.scatterplot.updateScatterplot();
    variableYAxisLinechart = stability_window
    linechart1.updateYAxisVariable()
}

function changeSimilarityMetricMatrix(){

    similarity_metric_matrix= $('#select-similarity-matrix').val()
    average_similarity_metric_matrix = 'averageA'+similarity_metric_matrix.substring(1)

    d3.selectAll('.label-simiarity')
    .text(()=> {
        if(similarity_metric_matrix=== 'adjustedRandScore') {
          return 'Adjusted Rand Score'
        }
        if(similarity_metric_matrix=== 'adjustedMutualInfoScore') {
          return 'Adjusted Mutual Information'
        }
      })
    
      d3.selectAll('.label-average-simiarity')
      .text(()=> {
        if(average_similarity_metric_matrix=== 'averageAdjustedRandScore') {
          return 'Average Adjusted Rand Score'
        }
        if(average_similarity_metric_matrix=== 'averageAdjustedMutualInfoScore') {
          return 'Average Adjusted Mutual Information'
        }
      })
    system.matrixAdjacency.updateMatrix(partitions,ALL_DATA[CURRENT_ITERATION].metrics.partitionsMetrics[similarity_metric_matrix],ALL_DATA[CURRENT_ITERATION].metrics.partitionsMetrics[average_similarity_metric_matrix]); 


    // AGGIOrNARE ANCHE IL VALORE DELLA matriche se è stato trovato early termination
    let index = previous_computations.length -1

    if (previous_computations[index].earlyTerminationfast !== -1){
        system.matrixAdjacencyFixed.updateMatrixplotEarlyTermination(partitions,ALL_DATA[previous_computations[index].earlyTerminationfast].metrics.partitionsMetrics[similarity_metric_matrix],ALL_DATA[previous_computations[index].earlyTerminationfast].metrics.partitionsMetrics[average_similarity_metric_matrix]);
    
    }
    
}


function uploadPreviousData(d,jobdata){

    ALL_DATA = jobdata.results
    CURRENT_ITERATION = jobdata.results.length -1
    ITERAZIONE_PER_MATRICE = 1
    dataset = d.dataset
    technique =  d.technique
    cluster = d.cluster
    partitions = d.partitions
    seed = d.seed
    readHistoryResult(ALL_DATA[CURRENT_ITERATION],ALL_DATA, jobdata, ALL_DATA[d.earlyTerminationslow], ALL_DATA[d.earlyTerminationfast])


}