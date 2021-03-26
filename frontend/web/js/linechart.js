let globalNumberBrushActually = {one: false, second:false, third: false}

let xMin1
let xMax1
let yMax1
let yMin1

let xMin2
let xMax2
let yMax2
let yMin2

let xMin3
let xMax3
let yMax3
let yMin3


if (window.system == undefined) window.system = {}
system.linechart = (function() {
    const that = this;

    // variable
    this.div = null
    this.data = []
    this.lastObj = null
    this.segmentedData = []
    this.technique = null
    
    this.divName = null
    this.margin = { top: 40, right: 30,bottom: 20, left: 60 }
    this.marginBetweenLineCharts = 15
    this.width = null
    this.height = null
    this.heightSingleLinechart = null
    
    this.xScale = null
    this.numerTicksYAxis = 5
    
    this.yScale1 = null
    this.xAxis1 = null
    this.yAxis1 = null
    this.attributeYAxisFirstLevel1 = null
    this.attributeYAxisSecondLevel1 = null
    this.labelYAxis1 = null
    this.line1 = d3.line()

    this.yScale2 = null
    this.xAxis2 = null
    this.yAxis2 = null
    this.attributeYAxisFirstLevel2 = null
    this.attributeYAxisSecondLevel2 = null
    this.labelYAxis2 = null
    this.line2 = d3.line()

    this.yScale3 = null
    this.xAxis3 = null
    this.yAxis3 = null
    this.attributeYAxisFirstLevel3 = null
    this.attributeYAxisSecondLevel3 = null
    this.attributeYAxisThirdLevel3 = null
    this.labelYAxis3 = null
    this.line3 = d3.line()

    verticalLines = []

    this.init = (idDiv, tech) => {
        this.div = d3.select(idDiv)
        this.technique = tech

        this.div.selectAll('svg')
            .remove();

        this.computeYAxisVariable()

        verticalLines = [ 
            {
                'name': 'fast',
                'draw': false,
                'iteration': null,
                'fill': "#ffd700",
                'label': 'Early Termination Fast'
            },
            {
                'name': 'slow',
                'draw': false,
                'iteration': null,
                'fill': "#c0c0c0",
                'label': 'Early Termination Slow'
            }
        ]

        this.divName = idDiv
        this.width = parseInt(this.div.style("width")) - this.margin.left - this.margin.right,
        this.height = parseInt(this.div.style("height")) - this.margin.top - this.margin.bottom;
        
        this.heightSingleLinechartArea = parseInt(parseInt(this.height)/3)
        this.heightSingleLinechart = parseInt(this.heightSingleLinechartArea - this.marginBetweenLineCharts)

        
        this.xScale = d3.scaleLinear().domain([0, 40]).range([0, this.width]);
        //PRIMO
        this.yScale1 = d3.scaleLinear().range([this.heightSingleLinechart, 0]);
        this.xAxis1 = d3.axisBottom().scale(this.xScale);
        this.yAxis1 = d3.axisLeft().scale(this.yScale1).ticks(this.numerTicksYAxis, "s");        
        this.line1 = d3.line()
            .curve(d3.curveMonotoneX)
            .x(function(d) {
                return that.xScale(d["iteration"]);
            })
            .y(function(d) {
                return that.yScale1(Math.abs(+d['metrics'][that.attributeYAxisFirstLevel1][that.attributeYAxisSecondLevel1]));
            });
        //SECONDO
        this.yScale2 = d3.scaleLinear().range([this.heightSingleLinechart, 0]);
        this.xAxis2 = d3.axisBottom().scale(this.xScale);
        this.yAxis2 = d3.axisLeft().scale(this.yScale2).ticks(this.numerTicksYAxis);       
        this.line2 = d3.line()
            .curve(d3.curveMonotoneX)
            .x(function(d) {
                return that.xScale(d["iteration"]);
            })
            .y(function(d) {
                return that.yScale2(d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]);
            });
        //TERZO
        this.yScale3 = d3.scaleLinear().range([this.heightSingleLinechart, 0]);
        this.xAxis3 = d3.axisBottom().scale(this.xScale);
        this.yAxis3 = d3.axisLeft().scale(this.yScale3).ticks(this.numerTicksYAxis);         
        this.line3 = d3.line()
            .curve(d3.curveMonotoneX)
            .x(function(d) {
                return that.xScale(d["iteration"]);
            })
            .y(function(d) {
                return that.yScale3(Math.abs(+d['metrics'][that.attributeYAxisFirstLevel3][that.attributeYAxisSecondLevel3][that.attributeYAxisThirdLevel3]));
            });
        return that
    } 

    this.updateEarlyTerminationFromHistory = (obj) =>{
        that.lastObj = obj
        this.updateVerticalLinesHistory(obj)
        
    }

    this.computeYAxisVariable = () => {


        switch(this.technique) {
            case 'I-PecK':
                this.attributeYAxisFirstLevel1 = "labelsMetrics"
                this.attributeYAxisSecondLevel1 = "inertia"
                this.labelYAxis1 = "Progress: inertia"
                break;
            case 'I-PecK++':
                this.attributeYAxisFirstLevel1 = "labelsMetrics"
                this.attributeYAxisSecondLevel1 = "inertia"
                this.labelYAxis1 = "Progress: inertia"
                break;
            case 'HGPA-PecK':
                this.attributeYAxisFirstLevel1 = "progressiveMetrics"
                this.attributeYAxisSecondLevel1 = "adjustedRandScore"
                this.labelYAxis1 = "Progress: adjustedRandScore"
                break;
            case 'HGPA-PecK++':
                this.attributeYAxisFirstLevel1 = "progressiveMetrics"
                this.attributeYAxisSecondLevel1 = "adjustedRandScore"
                this.labelYAxis1 = "Progress: adjustedRandScore"
                break;
            case 'MCLA-PecK':
                this.attributeYAxisFirstLevel1 = "progressiveMetrics"
                this.attributeYAxisSecondLevel1 = "adjustedRandScore"
                this.labelYAxis1 = "Progress: adjustedRandScore"
                break
            case 'MCLA-PecK++':
                this.attributeYAxisFirstLevel1 = "progressiveMetrics"
                this.attributeYAxisSecondLevel1 = "adjustedRandScore"
                this.labelYAxis1 = "Progress: adjustedRandScore"
                break;
            default:
              // code block
        }

        this.attributeYAxisFirstLevel2 = "labelsMetrics"
        this.attributeYAxisSecondLevel2 = $("#select-quality").val()
        //this.labelYAxis2 = "Quality: sim.Silhouette"

        if(qualityYAxisLinechart == "calinskyHarabasz"){
            this.labelYAxis2 = "Quality: Calinsky H."
        }else if(qualityYAxisLinechart == "dbIndex"){
            this.labelYAxis2 = "Quality: DB Index"
        }else if(qualityYAxisLinechart == "dunnIndex"){
            this.labelYAxis2 = "Quality: Dunn Index"
        }else if(qualityYAxisLinechart == "simplifiedSilhouette"){
            this.labelYAxis2 = "Quality: sim. Silhouette"
        }


        this.attributeYAxisFirstLevel3 = "progressiveMetrics"
        this.attributeYAxisSecondLevel3 = "globalStability"
        this.attributeYAxisThirdLevel3 = $("#select-window-stability").val()
        if(variableYAxisLinechart == "2"){
            this.labelYAxis3 = "Global stability: w2"
        }else if(variableYAxisLinechart == "3"){
            this.labelYAxis3 = "Global stability: w3"
        }else if(variableYAxisLinechart == "4"){
            this.labelYAxis3 = "Global stability: w4"
        }else if(variableYAxisLinechart == "5"){
            this.labelYAxis3 = "Global stability: w5"
        }else if(variableYAxisLinechart == "10"){
            this.labelYAxis3 = "Global stability: 10"
        }else if(variableYAxisLinechart == "all"){
            this.labelYAxis3 = "Global stability: all"
        }
        
    }

    this.updateYAxisVariable = () => {
        this.computeYAxisVariable()
        this.render()
    }

    this.setData = (data) => {
        this.lastObj = data[0]
        this.data = data
        this.segmentedData = []
        this.segmentData(data)
    }

    this.segmentData = (data) => {
        const ret = []
        for (let i=0; i<data.length; i++) {
          if(i == 0) ret.push([data[i], data[i]]);
          else ret.push([data[i-1], data[i]]);
        }
        this.segmentedData = ret
    }
     
    this.updateData = (obj) => {
        this.lastObj = obj
        this.data = this.data.concat(obj)
        this.segmentData(this.data)
        this.updateVerticalLines(obj)
        
        this.render()
    }

    this.updateVerticalLines = (obj) => {
        verticalLines.map(d => {
            if(!d.draw) {
                if(that.lastObj['metrics']['earlyTermination'][d.name]){ 
                    d["draw"] = true
                    d["iteration"] = that.lastObj.iteration
                    d3.select('.item-information').style('visibility','visible');
                    let current_computation_index = previous_computations.length-1
                    previous_computations[current_computation_index]['earlyTermination'+ d.name] = this.lastObj.iteration
                    previous_computations[current_computation_index][d.name+'Inertia'] = this.lastObj['metrics']['labelsMetrics']['inertia']
                    system.scatterplot.updateScatterplotEarlyTermination(obj.labels, obj.metrics.progressiveMetrics.adjustedRandScore,that.lastObj.iteration);
                    system.matrixAdjacencyFixed.updateMatrixplotEarlyTermination(partitions,obj.metrics.partitionsMetrics[similarity_metric_matrix],obj.metrics.partitionsMetrics[average_similarity_metric_matrix]);
                }
            }
        })
    }

    this.updateVerticalLinesHistory = (obj) => {
        verticalLines.map(d => {
            if(!d.draw) {
                if(that.lastObj['metrics']['earlyTermination'][d.name]){ 
                    d["draw"] = true
                    d["iteration"] = that.lastObj.iteration
                    
                    d3.select('.item-information').style('visibility','visible');
                    
                    system.scatterplot.updateScatterplotEarlyTermination(obj.labels, obj.metrics.progressiveMetrics.adjustedRandScore,that.lastObj.iteration);
                    system.matrixAdjacencyFixed.updateMatrixplotEarlyTermination(partitions,obj.metrics.partitionsMetrics[similarity_metric_matrix],obj.metrics.partitionsMetrics[average_similarity_metric_matrix]);

                }
            }
        })
    }

    this.render = () => {
        this.div.selectAll('svg')
            .remove();
        
        const svg = this.div.append("svg")
          .attr("width", this.width + this.margin.left + this.margin.right)
          .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
            .attr("class", "gLineChart")
        console.log('relatiYAxisLineCharts',relatiYAxisLineCharts)
        // Add Y axis
        if(relatiYAxisLineCharts){

            this.yScale1 = d3.scaleLinear()
                .domain(d3.extent(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel1][that.attributeYAxisSecondLevel1]); }))
                .range([ this.heightSingleLinechart, 0 ]);
            let minMaxSilouhette;//= d3.extent(this.data, function(d) { return d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]; })
            let minSilouhetteScale;
            let maxSilouhetteScale;
            if (this.attributeYAxisSecondLevel2  === 'simplifiedSilhouette'){
                // quando ho la simplified silhouette il dominio deve essere [-val,val]
                minMaxSilouhette = d3.extent(this.data, function(d) { return d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]; })
                if(Math.abs(minMaxSilouhette[0]) > Math.abs(minMaxSilouhette[1])) {
                    minSilouhetteScale = - Math.abs(minMaxSilouhette[0])
                    maxSilouhetteScale = Math.abs(minMaxSilouhette[0])
                }else{
                    minSilouhetteScale = - Math.abs(minMaxSilouhette[1])
                    maxSilouhetteScale = Math.abs(minMaxSilouhette[1])
                }
                this.yScale2 = d3.scaleLinear()
                    .domain([minSilouhetteScale, maxSilouhetteScale])
                    .range([ this.heightSingleLinechartArea + this.heightSingleLinechart, this.heightSingleLinechartArea ]);
                
            } else { // le altre metriche possono avere il min-max dei valori raccolti. 
                 this.yScale2 = d3.scaleLinear()
                    .domain( d3.extent(this.data, function(d) { return d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]; }))
                    .range([ this.heightSingleLinechartArea + this.heightSingleLinechart, this.heightSingleLinechartArea ]);            
            }
            this.yScale3 = d3.scaleLinear()
                    .domain(d3.extent(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel3][that.attributeYAxisSecondLevel3][that.attributeYAxisThirdLevel3]); }))
                    .range([ 2*this.heightSingleLinechartArea + this.heightSingleLinechart, 2 * this.heightSingleLinechartArea ]);
        }else{
            this.yScale1 = d3.scaleLinear()
                .domain([0, d3.max(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel1][that.attributeYAxisSecondLevel1]); })])
                .range([ this.heightSingleLinechart, 0 ]);

                let max2 = d3.max(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]);})
                if (qualityYAxisLinechart == "simplifiedSilhouette"){ // il dominio della simplifiedShljouette varia tra [-1,1]
                    this.yScale2 = d3.scaleLinear()
                    .domain([-1,1])
                    .range([ this.heightSingleLinechartArea + this.heightSingleLinechart, this.heightSingleLinechartArea ]);
                } else { // le altre metriche hanno un altro dominio, [0,max] al massimo ho aggiunto un 10% per aumentare la visibilità
                    if (max2 > 1){
                        this.yScale2 = d3.scaleLinear()
                        .domain([0,max2*1.10])
                        .range([ this.heightSingleLinechartArea + this.heightSingleLinechart, this.heightSingleLinechartArea ]);
                    } else {
                        this.yScale2 = d3.scaleLinear()
                        .domain([0,1])
                        .range([ this.heightSingleLinechartArea + this.heightSingleLinechart, this.heightSingleLinechartArea ]);
                    
                    }
                }
            
            this.yScale3 = d3.scaleLinear()
                .domain([0, 1])
                .range([ 2*this.heightSingleLinechartArea + this.heightSingleLinechart, 2 * this.heightSingleLinechartArea ]);
            
        }
        
        this.yAxis1 = d3.axisLeft().scale(this.yScale1).ticks(this.numerTicksYAxis, "s");    
        this.yAxis2 = d3.axisLeft().scale(this.yScale2).ticks(this.numerTicksYAxis);  
        this.yAxis3 = d3.axisLeft().scale(this.yScale3).ticks(this.numerTicksYAxis, "s"); 
        
        if(this.data.length>40) {
            this.xScale = d3.scaleLinear().domain([0, this.data.length]).range([0, this.width]);

            this.xAxis1 = d3.axisBottom().scale(this.xScale);
            this.xAxis2 = d3.axisBottom().scale(this.xScale);
            this.xAxis3 = d3.axisBottom().scale(this.xScale);
        }

        svg.append("g")
            .attr("class", "x axisLineChart")
            .attr("transform", "translate(0," + this.heightSingleLinechart + ")")
            .call(this.xAxis1);

        svg.append("g")
            .attr("class", "x axisLineChart")
            .attr("transform", () => {if (this.attributeYAxisSecondLevel2  === 'simplifiedSilhouette')
            return"translate(0," + (this.yScale2(0))  + ")";
            else return "translate(0," + (2*this.heightSingleLinechartArea) + ")";})
            .call(this.xAxis2);
        
        svg.append("g")
            .attr("class", "x axisLineChart")
            .attr("transform", "translate(0," + (2*this.heightSingleLinechartArea + this.heightSingleLinechart) + ")")
            .call(this.xAxis3);
        
        svg.append("g")
            .attr("class", "y axisLineChart")
            .call(this.yAxis1)
        svg.append("g")
            .attr("class", "y axisLineChart")
            .call(this.yAxis2)
        svg.append("g")
            .attr("class", "y axisLineChart")
            .call(this.yAxis3)

        var brush1 = d3.brush()                   // Add the brush feature using the d3.brush function
            .extent( [ [0,0], [this.width, this.heightSingleLinechart] ] )  // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
            .on("end", updateBrush1)

        var brush2 = d3.brush()                   // Add the brush feature using the d3.brush function
            .extent( [ [0,this.heightSingleLinechartArea], [this.width, this.heightSingleLinechartArea + this.heightSingleLinechart] ] )  // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
            .on("end", updateBrush2)

        var brush3 = d3.brush()                   // Add the brush feature using the d3.brush function
            .extent( [ [0, 2*this.heightSingleLinechartArea], [this.width, 2*this.heightSingleLinechartArea + this.heightSingleLinechart] ] )  // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
            .on("end", updateBrush3)

        svg.append("g")
            .attr("class", "brush")
            .call(brush1);

        svg.append("g")
            .attr("class", "brush")
            .call(brush2);
        
        svg.append("g")
            .attr("class", "brush")
            .call(brush3);

        function updateBrush1({selection}) {
            if (selection === null) {
                updateTimeBarDown('one', true)
            } else {
                xMin1 = that.xScale.invert(selection[0][0])
                xMax1 = that.xScale.invert(selection[1][0])
                yMax1 = that.yScale1.invert(selection[0][1])
                yMin1 = that.yScale1.invert(selection[1][1])
                
                updateTimeBarDown('one', false)
            }
        }

        function updateBrush2({selection}) {
            if (selection === null) {
                updateTimeBarDown('second', true)
            } else {
                xMin2 = that.xScale.invert(selection[0][0])
                xMax2 = that.xScale.invert(selection[1][0])
                yMax2 = that.yScale2.invert(selection[0][1])
                yMin2 = that.yScale2.invert(selection[1][1])
                
                updateTimeBarDown('second', false)
            }jb
        }

        function updateBrush3({selection}) {
            if (selection === null) {
                updateTimeBarDown('third', true)
            } else {
                xMin3 = that.xScale.invert(selection[0][0])
                xMax3 = that.xScale.invert(selection[1][0])
                yMax3 = that.yScale3.invert(selection[0][1])
                yMin3 = that.yScale3.invert(selection[1][1])
                
                updateTimeBarDown('third', false)
            }
        }

        

        function updateTimeBarDown (numberLinechart, removeFromState){
            if(removeFromState) globalNumberBrushActually[numberLinechart] = false
            else globalNumberBrushActually[numberLinechart] = true

            d3.select('#timeline-partitions')
                .selectAll('rect.rect-partition')
                .style('opacity', (d)=> {
                    let current_index = parseInt(d[1].replace('P',''))

                    if(system.timelinepartitions.partitions_status[current_index][2])
                        return 1;
                    else
                        return 0;
                    })
            if(globalNumberBrushActually['one']){
                d3.select('#timeline-partitions')
                .selectAll('rect.rect-partition')
                .filter( d => d[5][that.attributeYAxisSecondLevel1] < yMin1 || d[5][that.attributeYAxisSecondLevel1] > yMax1 || d[0] < xMin1 || d[0] > xMax1)
                .style('opacity', (d)=> {
                let current_index = parseInt(d[1].replace('P',''))
                if(system.timelinepartitions.partitions_status[current_index][2])
                    return 0.1;
                else
                    return 0;
                })
            }

            if(globalNumberBrushActually['second']){
                d3.select('#timeline-partitions')
                .selectAll('rect.rect-partition')
                .filter( d => d[5][that.attributeYAxisSecondLevel2] < yMin2 || d[5][that.attributeYAxisSecondLevel2] > yMax2 || d[0] < xMin2 || d[0] > xMax2)
                .style('opacity', (d)=> {
                let current_index = parseInt(d[1].replace('P',''))
                if(system.timelinepartitions.partitions_status[current_index][2])
                    return 0.1;
                else
                    return 0;
                })
            }

            if(globalNumberBrushActually['third']){
                d3.select('#timeline-partitions')
                .selectAll('rect.rect-partition')
                .filter( d => d[5]['globalStability'+variableYAxisLinechart] < yMin3 || d[5]['globalStability'+variableYAxisLinechart] > yMax3 || d[0] < xMin3 || d[0] > xMax3)
                .style('opacity', (d)=> {
                let current_index = parseInt(d[1].replace('P',''))
                if(system.timelinepartitions.partitions_status[current_index][2])
                    return 0.1;
                else
                    return 0;
                })
            }
        }

        //labels
        svg.append("text")
            .attr("class", "textXAxis")            
            .attr("transform",
                  "translate(" + (this.width/2) + " ," + 
                                 (3 * this.heightSingleLinechartArea + this.margin.top) + ")")
            .style("text-anchor", "middle")
            .text("Iterations");
        
        svg.append("text")
            .attr("class", "textYAxis")   
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margin.left)
            .attr("x",0 - (this.heightSingleLinechart / 2))
            .attr("dy", "1em")
            .style("font-size", "x-small")
            .style("text-anchor", "middle")
            .text(that.labelYAxis1);  

        svg.append("text")
            .attr("class", "textYAxis")   
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margin.left)
            .attr("x",0 - (this.heightSingleLinechartArea + (this.heightSingleLinechart / 2)))
            .attr("dy", "1em")
            .style("font-size", "x-small")
            .style("text-anchor", "middle")
            .text(that.labelYAxis2); 

        svg.append("text")
            .attr("class", "textYAxis")   
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margin.left)
            .attr("x",0 - ((2*this.heightSingleLinechartArea) + (this.heightSingleLinechart / 2)))
            .style("font-size", "x-small")
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(that.labelYAxis3); 

        drawLegend()
        updateRendering()

    }

    this.clearAll = () => {
        this.div.selectAll('svg')
            .remove();

        d3.selectAll('.linechart_select').style('display','none')
    }

    let drawLegend = () => {
        const svgLegend = that.div.select("g.gLineChart")

        const ordinalScale = d3.scaleOrdinal()
            .domain(verticalLines.map(d => d.label))
            .range(verticalLines.map(d => d.fill));

        svgLegend.append("g")
            .attr("class", "legendOrdinal")
            .attr("transform", "translate(0," + (0-that.margin.top) + ")")
            
        const legendOrdinal = d3.legendColor()
            .orient("horizontal")
            .shape("rect")
            .shapeWidth(15)
            .shapeHeight(5)
            .shapePadding(that.width/verticalLines.length)
            .scale(ordinalScale);
            
          
        svgLegend.select(".legendOrdinal")
            .call(legendOrdinal);

    }

    let updateRendering = () => {
        clearPartition()

        let vv = that.div.select("g.gLineChart")
            .selectAll('line.lineVertical')
            .data(verticalLines)
            .join(
                enter => enter
                    .append("line")
                    .attr('class', 'lineVertical')
                    .attr('x1', d=> {
                        if(verticalLines[0].iteration == verticalLines[0].iteration && d.name == "fast"){
                            return that.xScale(d.iteration) - 3
                        }else{
                            return that.xScale(d.iteration)
                        } 
                    })
                    .attr('x2', d=> {
                        if(verticalLines[0].iteration == verticalLines[0].iteration && d.name == "fast"){
                            return that.xScale(d.iteration) - 3
                        }else{
                            return that.xScale(d.iteration)
                        }
                    })
                    .attr("y1", that.height - (that.marginBetweenLineCharts))
                    .attr("y2", 0)
                    .attr("stroke", d=> (d.fill))
                    .attr("stroke-opacity", 0.8)
                    .attr("stroke-width", 3)
                    //.attr("stroke-dasharray", "2,2")
                    .attr("display", d=> {
                        if(d.draw) return "block"
                        else return "none"
                    })
                    .attr("data-tippy-content", d => "" + d.label + " at iteration " + d.iteration),
                update => update
                    .attr('x1', d=> that.xScale(d.iteration))
                    .attr('x2', d=> that.xScale(d.iteration))
                    .attr("y1", that.height)
                    .attr("y2", 0)
                    .attr("stroke", d=> (d.fill))
                    .attr("stroke-opacity", 0.8)
                    .attr("stroke-width", 6)
                    .attr("stroke-dasharray", "2,2")
                    .attr("display", d=> {
                        if(d.draw) return "block"
                        else return "none"
                    }),
                exit => exit
                    .call(exit => exit
                        .transition()
                        .duration(0)
                        .remove()
                    )
                )

        tippy(vv.nodes(),{delay: 300});

        that.div.select("g.gLineChart")
            .selectAll('path.lineLineChart1')
            .data(that.segmentedData)
            .join(
                enter => enter
                    .append('path')
                    .attr('class', 'lineLineChart1')
                    .attr('stroke', d=> { return d3.interpolateGreens(0.75)})
                    .attr('d', d =>  that.line1(d)),
                update => update
                .call(update => update
                    .transition()
                    .duration(0)
                    //.style("stroke", 'red')
                ),
                exit => exit
                .call(exit => exit
                    .transition()
                    .duration(0)
                    .remove()
                )
            )  

        that.div.select("g.gLineChart")
            .selectAll('path.lineLineChart2')
            .data(that.segmentedData)
            .join(
                enter => enter
                    .append('path')
                    .attr('class', 'lineLineChart2')
                    .attr('stroke', d => { return d3.interpolateReds(0.75)})
                    .attr('d', d =>  that.line2(d)),
                update => update
                .call(update => update
                    .transition()
                    .duration(0)
                    //.style("stroke", 'red')
                ),
                exit => exit
                .call(exit => exit
                    .transition()
                    .duration(0)
                    .remove()
                )
            )  

        that.div.select("g.gLineChart")
            .selectAll('path.lineLineChart3')
            .data(that.segmentedData)
            .join(
                enter => enter
                    .append('path')
                    .attr('class', 'lineLineChart3')
                    .style("stroke", 'steelblue')
                    .attr('d', d =>  that.line3(d)),
                update => update
                .call(update => update
                    .transition()
                    .duration(0)
                    //.style("stroke", 'red')
                ),
                exit => exit
                .call(exit => exit
                    .transition()
                    .duration(0)
                    .remove()
                )
            )  

        let format7 = d3.format(".7f");

        let circle1 = that.div.select("g.gLineChart")
            .selectAll('circle.circle1')
            .data(that.data)
            .join(
                enter => enter
                    .append('circle')
                    .attr('class', 'circle1')
                    .style("fill", d=> { return d3.interpolateGreens(0.75)})
                    .attr("r", 2)
                    .attr("cx", d => that.xScale(d.iteration))
                    .attr("cy", d => that.yScale1(Math.abs(+d['metrics'][that.attributeYAxisFirstLevel1][that.attributeYAxisSecondLevel1])))
                    //.attr("data-tippy-content", d => "" +that.labelYAxis1+": "+ format7(d['metrics'][that.attributeYAxisFirstLevel1][that.attributeYAxisSecondLevel1])),
                    .on("mouseover", function(event,d) {

                        console.log(event)
                        let div = d3.select('#history-tooltip')
                        div.transition()		
                            .duration(200)		
                            .style("opacity", 1);		
                        div.html( "" +that.labelYAxis1+": "+ format7(d['metrics'][that.attributeYAxisFirstLevel1][that.attributeYAxisSecondLevel1]))
                            .style("left", (event.clientX) + "px")		
                            .style("top", (event.clientY - 28) + "px");	
                        })					
                    .on("mouseout", function(d,i) {	
                        let div = d3.select('#history-tooltip')	
                        div.transition()		
                            .duration(500)		
                            .style("opacity", 0);	
                    }),
                update => update
                .call(update => update
                    .transition()
                    .duration(0)
                    //.style("stroke", 'red')
                ),
                exit => exit
                .call(exit => exit
                    .transition()
                    .duration(0)
                    .remove()
                )
            )  
        //tippy(circle1.nodes(),{delay: 300});

        let circle2 = that.div.select("g.gLineChart")
            .selectAll('circle.circle2')
            .data(that.data)
            .join(
                enter => enter
                    .append('circle')
                    .attr('class', 'circle2')
                    .style("fill", d => { return d3.interpolateReds(0.75)})
                    .attr("r", 2)
                    .attr("cx", d => that.xScale(d.iteration))
                    .attr("cy", d => that.yScale2(d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]))
                    //.attr("data-tippy-content", d => "" +that.labelYAxis2+": "+ format7(d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2])),
                    .on("mouseover", function(event,d) {
                        console.log(event)
                        let div = d3.select('#history-tooltip')
                        div.transition()		
                            .duration(200)		
                            .style("opacity", 1);		
                        div.html( "" +that.labelYAxis2+": "+ format7(d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]))
                            .style("left", (event.clientX) + "px")		
                            .style("top", (event.clientY - 28) + "px");	
                        })					
                    .on("mouseout", function(d,i) {	
                        let div = d3.select('#history-tooltip')	
                        div.transition()		
                            .duration(500)		
                            .style("opacity", 0);	
                    }),
                update => update
                .call(update => update
                    .transition()
                    .duration(0)
                    //.style("stroke", 'red')
                ),
                exit => exit
                .call(exit => exit
                    .transition()
                    .duration(0)
                    .remove()
                )
            )  
        //tippy(circle2.nodes(),{delay: 300});

        let circle3 = that.div.select("g.gLineChart")
            .selectAll('circle.circle3')
            .data(that.data)
            .join(
                enter => enter
                    .append('circle')
                    .attr('class', 'circle3')
                    .style("fill", 'steelblue')
                    .attr("r", 2)
                    .attr("cx", d => that.xScale(d.iteration))
                    .attr("cy", d => that.yScale3(Math.abs(+d['metrics'][that.attributeYAxisFirstLevel3][that.attributeYAxisSecondLevel3][that.attributeYAxisThirdLevel3])))
                    //.attr("data-tippy-content", d => "" +that.labelYAxis3+": "+ format7(Math.abs(+d['metrics'][that.attributeYAxisFirstLevel3][that.attributeYAxisSecondLevel3][that.attributeYAxisThirdLevel3]))),
                    .on("mouseover", function(event,d) {
                        console.log(event)
                        let div = d3.select('#history-tooltip')
                        div.transition()		
                            .duration(200)		
                            .style("opacity", 1);		
                        div.html( "" +that.labelYAxis3+": "+ format7(Math.abs(+d['metrics'][that.attributeYAxisFirstLevel3][that.attributeYAxisSecondLevel3][that.attributeYAxisThirdLevel3])))
                            .style("left", (event.clientX) + "px")		
                            .style("top", (event.clientY - 28) + "px");	
                        })					
                    .on("mouseout", function(d,i) {	
                        let div = d3.select('#history-tooltip')	
                        div.transition()		
                            .duration(500)		
                            .style("opacity", 0);	
                    }),
                    update => update
                .call(update => update
                    .transition()
                    .duration(0)
                    //.style("stroke", 'red')
                ),
                exit => exit
                .call(exit => exit
                    .transition()
                    .duration(0)
                    .remove()
                )
            )  
        //tippy(circle3.nodes(),{delay: 300});
        
    }

    let clearPartition = () => {
        globalNumberBrushActually = {one: false, second:false, third: false}
        d3.select('#timeline-partitions')
            .selectAll('rect.rect-partition')
            .style('opacity', (d)=> {
                let current_index = parseInt(d[1].replace('P',''))
                if(system.timelinepartitions.partitions_status[current_index][2])
                    return 1;
                else
                    return 0;
                })
            //.style('opacity', 1)
    }

    return this;
}).call({})