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
        this.yAxis2 = d3.axisLeft().scale(this.yScale2).ticks(this.numerTicksYAxis, "s");       
        this.line2 = d3.line()
            .curve(d3.curveMonotoneX)
            .x(function(d) {
                return that.xScale(d["iteration"]);
            })
            .y(function(d) {
                return that.yScale2(Math.abs(+d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]));
            });
        //TERZO
        this.yScale3 = d3.scaleLinear().range([this.heightSingleLinechart, 0]);
        this.xAxis3 = d3.axisBottom().scale(this.xScale);
        this.yAxis3 = d3.axisLeft().scale(this.yScale3).ticks(this.numerTicksYAxis, "s");         
        this.line3 = d3.line()
            .curve(d3.curveMonotoneX)
            .x(function(d) {
                return that.xScale(d["iteration"]);
            })
            .y(function(d) {
                return that.yScale3(Math.abs(+d['metrics'][that.attributeYAxisFirstLevel3][that.attributeYAxisSecondLevel3]));
            });
        
        return that
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
        this.attributeYAxisSecondLevel2 = "simplifiedSilhouette"
        this.labelYAxis2 = "Quality: sim.Silhouette"

        if(variableYAxisLinechart == "globalStability0"){
            this.attributeYAxisFirstLevel3 = "progressiveMetrics"
            this.attributeYAxisSecondLevel3 = "globalStability0"
            this.labelYAxis3 = "Global Stability 0"
        }else if(variableYAxisLinechart == "globalStability1"){
            this.attributeYAxisFirstLevel3 = "progressiveMetrics"
            this.attributeYAxisSecondLevel3 = "globalStability1"
            this.labelYAxis3 = "Global Stability 1"
        }else if(variableYAxisLinechart == "globalStability2"){
            this.attributeYAxisFirstLevel3 = "progressiveMetrics"
            this.attributeYAxisSecondLevel3 = "globalStability2"
            this.labelYAxis3 = "Global Stability 2"
        }else if(variableYAxisLinechart == "globalStabilityEXP"){
            this.attributeYAxisFirstLevel3 = "progressiveMetrics"
            this.attributeYAxisSecondLevel3 = "globalStabilityEXP"
            this.labelYAxis3 = "globalStabilityEXP"
        }else if(variableYAxisLinechart == "globalStabilityEXP5"){
            this.attributeYAxisFirstLevel3 = "progressiveMetrics"
            this.attributeYAxisSecondLevel3 = "globalStabilityEXP5"
            this.labelYAxis3 = "globalStabilityEXP5"
        }else if(variableYAxisLinechart == "globalStabilityLOG"){
            this.attributeYAxisFirstLevel3 = "progressiveMetrics"
            this.attributeYAxisSecondLevel3 = "globalStabilityLOG"
            this.labelYAxis3 = "globalStabilityLOG"
        }else if(variableYAxisLinechart == "globalStabilityLOG5"){
            this.attributeYAxisFirstLevel3 = "progressiveMetrics"
            this.attributeYAxisSecondLevel3 = "globalStabilityLOG5"
            this.labelYAxis3 = "globalStabilityLOG5"
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
     
    this.updateData = (obj,data_matrix) => {
        this.lastObj = obj
        this.data = this.data.concat(obj)
        this.segmentData(this.data)
        //[X GIORGIO] aggiungo qui il passaggio dell'oggetto essendo labels. 
        that.updateVerticalLines(obj,data_matrix)
        
        this.render()
    }

    this.updateVerticalLines = (obj,data_matrix) => {
        verticalLines.map(d => {
            if(!d.draw) {
                if(this.lastObj['metrics']['earlyTermination'][d.name]){ 
                    d["draw"] = true
                    d["iteration"] = this.lastObj.iteration
                    console.log('ALESSIA SUSHI',obj)
                    system.scatterplot.updateScatterplotEarlyTermination(obj.labels, obj.metrics.progressiveMetrics.adjustedRandScore);
                    system.matrixAdjacencyFixed.updateMatrixplotEarlyTermination(partitions,obj.metrics.partitionsMetrics.adjustedRandScore,obj.metrics.partitionsMetrics.adjustedMutualInfoScore);
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
            .attr("transform", "translate(0," + (this.heightSingleLinechartArea + this.heightSingleLinechart)  + ")")
            .call(this.xAxis2);
        
        svg.append("g")
            .attr("class", "x axisLineChart")
            .attr("transform", "translate(0," + (2*this.heightSingleLinechartArea + this.heightSingleLinechart) + ")")
            .call(this.xAxis3);
          
        // Add Y axis
        if(relatiYAxisLineCharts){
            this.yScale1 = d3.scaleLinear()
                .domain(d3.extent(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel1][that.attributeYAxisSecondLevel1]); }))
                .range([ this.heightSingleLinechart, 0 ]);
            this.yScale2 = d3.scaleLinear()
                .domain(d3.extent(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]); }))
                .range([ this.heightSingleLinechartArea + this.heightSingleLinechart, this.heightSingleLinechartArea ]);
            this.yScale3 = d3.scaleLinear()
                .domain(d3.extent(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel3][that.attributeYAxisSecondLevel3]); }))
                .range([ 2*this.heightSingleLinechartArea + this.heightSingleLinechart, 2 * this.heightSingleLinechartArea ]);
            
        }else{
            this.yScale1 = d3.scaleLinear()
                .domain([0, d3.max(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel1][that.attributeYAxisSecondLevel1]); })])
                .range([ this.heightSingleLinechart, 0 ]);

            this.yScale2 = d3.scaleLinear()
                .domain([0, d3.max(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel2][that.attributeYAxisSecondLevel2]); })])
                .range([ this.heightSingleLinechartArea + this.heightSingleLinechart, this.heightSingleLinechartArea ]);
            
            this.yScale3 = d3.scaleLinear()
                .domain([0, d3.max(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel3][that.attributeYAxisSecondLevel3]); })])
                .range([ 2*this.heightSingleLinechartArea + this.heightSingleLinechart, 2 * this.heightSingleLinechartArea ]);
            
        }
        
        this.yAxis1 = d3.axisLeft().scale(this.yScale1).ticks(this.numerTicksYAxis, "s");    
        this.yAxis2 = d3.axisLeft().scale(this.yScale2).ticks(this.numerTicksYAxis, "s");  
        this.yAxis3 = d3.axisLeft().scale(this.yScale3).ticks(this.numerTicksYAxis, "s");  
        
        svg.append("g")
            .attr("class", "y axisLineChart")
            .call(this.yAxis1)
        svg.append("g")
            .attr("class", "y axisLineChart")
            .call(this.yAxis2)
        svg.append("g")
            .attr("class", "y axisLineChart")
            .call(this.yAxis3)
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
        let vv = that.div.select("g.gLineChart")
            .selectAll('line.lineVertical')
            .data(verticalLines)
            .join(
                enter => enter
                    .append("line")
                    .attr('class', 'lineVertical')
                    .attr('x1', d=> that.xScale(d.iteration))
                    .attr('x2', d=> that.xScale(d.iteration))
                    .attr("y1", that.height - (that.marginBetweenLineCharts))
                    .attr("y2", 0)
                    .attr("stroke", d=> (d.fill))
                    .attr("stroke-opacity", 0.8)
                    .attr("stroke-width", 6)
                    .attr("stroke-dasharray", "2,2")
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
    }

    return this;
}).call({})