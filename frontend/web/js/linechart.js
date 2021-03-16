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
    this.margin = { top: 35, right: 30, bottom: 50, left: 60 }
    this.width = null
    this.height = null
    this.xScale = null
    this.yScale = null
    this.xAxis = null
    this.yAxis = null

    this.attributeYAxisFirstLevel = null
    this.attributeYAxisSecondLevel = null
    this.labelYAxis = null
    
    // Define lines
    this.line = d3.line()
    verticalLines = []

    this.init = (idDiv, tech) => {
        this.div = d3.select(idDiv)
        this.technique = tech

        this.div.selectAll('svg')
            .remove();

        switch(this.technique) {
            case 'I-PecK':
                this.attributeYAxisFirstLevel = "labelsMetrics"
                this.attributeYAxisSecondLevel = "inertia"
                this.labelYAxis = "inertia"
                break;
            case 'I-PecK++':
                this.attributeYAxisFirstLevel = "labelsMetrics"
                this.attributeYAxisSecondLevel = "inertia"
                this.labelYAxis = "inertia"
                break;
            case 'HGPA-PecK':
                this.attributeYAxisFirstLevel = "progessiveMetrics"
                this.attributeYAxisSecondLevel = "adjustedRandScore"
                this.labelYAxis = "adjustedRandScore"
                break;
            case 'HGPA-PecK++':
                this.attributeYAxisFirstLevel = "progessiveMetrics"
                this.attributeYAxisSecondLevel = "adjustedRandScore"
                this.labelYAxis = "adjustedRandScore"
                break;
            case 'MCLA-PecK':
                this.attributeYAxisFirstLevel = "progessiveMetrics"
                this.attributeYAxisSecondLevel = "adjustedRandScore"
                this.labelYAxis = "adjustedRandScore"
                break
            case 'MCLA-PecK++':
                this.attributeYAxisFirstLevel = "progessiveMetrics"
                this.attributeYAxisSecondLevel = "adjustedRandScore"
                this.labelYAxis = "adjustedRandScore"
                break;
            default:
              // code block
        }

        verticalLines = [ 
            {
                'name': 'fast',
                'draw': false,
                'iteration': null,
                'fill': "#FDE725",
                'label': 'Early Termination Fast'
            },
            {
                'name': 'slow',
                'draw': false,
                'iteration': null,
                'fill': "#3CBB75",
                'label': 'Early Termination Slow'
            }
        ]

        this.divName = idDiv
        this.width = parseInt(this.div.style("width")) - this.margin.left - this.margin.right,
        this.height = parseInt(this.div.style("height")) - this.margin.top - this.margin.bottom;
        this.xScale = d3.scaleLinear().domain([0, 40]).range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);
        this.xAxis = d3.axisBottom().scale(this.xScale);
        this.yAxis = d3.axisLeft().scale(this.yScale).tickFormat(d3.format("~s"));        
        this.line = d3.line()
            .curve(d3.curveMonotoneX)
            .x(function(d) {
                return that.xScale(d["iteration"]);
            })
            .y(function(d) {
                return that.yScale(Math.abs(+d['metrics'][that.attributeYAxisFirstLevel][that.attributeYAxisSecondLevel]));
            });
        return that
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
        //updateRendering()
    }

    this.updateVerticalLines = (obj,data_matrix) => {
        verticalLines.map(d => {
            if(!d.draw) {
                if(this.lastObj['metrics']['earlyTermination'][d.name]){ 
                    d["draw"] = true
                    d["iteration"] = this.lastObj.iteration
                    console.log('ALESSIA SUSHI',obj)
                    //[X GIORGIO] MI SERVE LEGARMI A QUESTA FUNZIONE PER FOTOGRAFARE LO SCATTERPLOT O LA TABELLA
                    system.scatterplot.updateScatterplotEarlyTermination(obj.labels, obj.metrics.progessiveMetrics.adjustedRandScore);
                    // qiui me ne disegna 3 perchè entra 3 volte in questo ciclo. 
                    // ALESSIA qui update della matrice 2
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
            this.xAxis = d3.axisBottom().scale(this.xScale);
        }

        svg.append("g")
            .attr("class", "x axisLineChart")
            .attr("transform", "translate(0," + this.height + ")")
            .call(this.xAxis);
          
        // Add Y axis
        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, function(d) { return Math.abs(+d['metrics'][that.attributeYAxisFirstLevel][that.attributeYAxisSecondLevel]); })])
            .range([ this.height, 0 ]);
        svg.append("g")
            .attr("class", "y axisLineChart")
            .call(this.yAxis)
        
        //labels
        svg.append("text")
            .attr("class", "textXAxis")            
            .attr("transform",
                  "translate(" + (this.width/2) + " ," + 
                                 (this.height + this.margin.top) + ")")
            .style("text-anchor", "middle")
            .text("Iterations");
        
        svg.append("text")
            .attr("class", "textYAxis")   
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margin.left)
            .attr("x",0 - (this.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(that.labelYAxis);  

        drawLegend()
        updateRendering()

        let resize = function () {
            that.width = parseInt(that.div.style("width")) - that.margin.left - that.margin.right,
            that.height = parseInt(that.div.style("height")) - that.margin.top - that.margin.bottom;
            that.xScale.range([0, that.width]);
            that.yScale.range([that.height, 0]);
            
            that.xAxis = d3.axisBottom().scale(that.xScale);
            //that.yAxis = d3.axisLeft().scale(that.yScale);
            that.yAxis = d3.axisLeft().scale(that.yScale).tickFormat(d3.format("~s"));      
            
            // Update the axis and text with the new scale
            svg.select(".x.axisLineChart")
                .attr("transform", "translate(0," + that.height + ")")
                .call(that.xAxis);
            
            svg.select(".y.axisLineChart").call(that.yAxis);

            svg.select(".textXAxis")             
                .attr("transform",
                    "translate(" + (that.width/2) + " ," + 
                                    (that.height + that.margin.top ) + ")")
                .style("text-anchor", "middle")
                .text("Iterations");

            svg.select(".textYAxis")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - that.margin.left)
                .attr("x",0 - (that.height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text(that.labelYAxis);   

            svg.select(".legendOrdinal")
                .attr("transform", "translate(0," + (0-that.margin.top) + ")")
                //.attr("transform", "translate(" + (that.width - that.margin.left) + ","+ that.margin.top + ")");
                    
            // Force D3 to recalculate and update the line
            svg.selectAll(".lineLineChart").attr("d", function(d) {
                return that.line(d);
            })   

            svg.selectAll('.lineVertical')
                .attr('x1', d=> that.xScale(d.iteration))
                .attr('x2', d=> that.xScale(d.iteration))
                .attr("y1", that.height)
                .attr("y2", 0)
            
            // Update the tick marks
            that.xAxis.ticks(Math.max(that.width / 75, 2));
            that.yAxis.ticks(Math.max(that.height / 50, 2));
        }
        
        // Call the resize function whenever a resize event occurs
        d3.select(window).on('resize', resize);

        // Call the resize function
        resize();
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
                    .attr("y1", that.height)
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
            .selectAll('path.lineLineChart')
            .data(that.segmentedData)
            .join(
                enter => enter
                    .append('path')
                    .attr('class', 'lineLineChart')
                    .attr('d', d =>  that.line(d)),
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