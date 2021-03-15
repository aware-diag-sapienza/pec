if (window.system == undefined) window.system = {}
system.timelinepartitions = (function() {
    const that = this;

    // variable
    this.div = null
    this.data = []
    this.lastObj = null
    this.segmentedData = []
    this.technique = null
    this.attibuteToCompareWithValue1 = null
    this.attibuteToCompareWithValue2 = null

    this.divName = null
    this.margin = { top: 10, right: 30,bottom: 30, left: 60 }
    this.width = null
    this.height = null
    this.xScale = null
    this.yScale = null
    this.xAxis = null
    this.yAxis = null
    this.colorScaleCell = null

    this.attributeYAxis = null
    this.labelYAxis = 'partitions'
    
    // Define lines
    this.line = d3.line()
    //this.verticalLines = []

    this.init = (idDiv, tech, numPart) => {
        this.div = d3.select(idDiv)
        console.log('idDiv', idDiv)
        this.technique = tech

        this.div.selectAll('svg')
            .remove();

        verticalLines = [ 
            {
                'name': 'earlyTerminationFast',
                'draw': false,
                'iteration': null,
                'fill': "#fdd0a2",
                'label': 'Early Termination Fast',
                'threshold': 0.0001
            },
            {
                'name': 'earlyTerminationMedium',
                'draw': false,
                'iteration': null,
                'fill': "#fdae6b",
                'label': 'Early Termination Medium',
                'threshold': 0.00001
            },
            {
                'name': 'earlyTerminationSlow',
                'draw': false,
                'iteration': null,
                'fill': "#f16913",
                'label': 'Early Termination Slow',
                'threshold': 0.000001
            }
        ]

        this.divName = idDiv
        this.width = parseInt(this.div.style("width")) - this.margin.left - this.margin.right,
        this.height = parseInt(this.div.style("height")) - this.margin.top - this.margin.bottom;
        this.xScale = d3.scaleBand().domain([...Array(40).keys()]).range([0, this.width]).paddingInner(0.2).paddingOuter(0.2);//d3.scaleLinear().domain([0, 40]).range([0, this.width]);
        this.yScale = d3.scaleBand().domain(Array.from({length:partitions},(_,i)=> 'P'+i).reverse()).range([this.height, 0]).paddingInner(0.2).paddingOuter(0.2);//d3.scaleLinear().range([this.height, 0]);
        this.xAxis = d3.axisBottom().scale(this.xScale);
        this.yAxis = d3.axisLeft().scale(this.yScale)//.tickFormat(d3.format("~s"));   
        
        //this.colorScaleCell= d3.scaleLinear().domain([0,1])
        //d3.scaleThreshold()
        //.domain([38000000, 42000000,47000000])
        //.range(["yellow", "pink", "red", "purple"])//d3.scaleLinear().domain([0,1]).range([0,1000])
        this.line = d3.line()
            .curve(d3.curveMonotoneX)
            .x(function(d) {
                return that.xScale(d["iteration"]);
            })
            .y(function(d) {
                return that.yScale(Math.abs(+d[that.attributeYAxis]));
            });

        return that
    } 

    this.setData = (data) => {
        this.data = data
        this.lastObj = data[0]
        this.colorScaleCell = d3.scaleLinear()
            .range([1,0])
            .domain(
                [0, d3.max(data[0].metrics.partitionsMetrics.inertia)])
        }

    
    this.updateData = (obj,data_matrix) => {
        this.lastObj = obj
        this.data = this.data.concat(obj)
        // modificare qui la parte per la scala di colore della timeline
        console.log('ALESSIA',obj.iteration === 5,obj.iteration,5)
        if (obj.iteration === 5 || d3.min(obj.metrics.partitionsMetrics.inertia) < this.colorScaleCell.domain()[0]){
            let min_range = d3.min(obj.metrics.partitionsMetrics.inertia) - (d3.min(obj.metrics.partitionsMetrics.inertia))*0.05
            let max_range = this.colorScaleCell.domain()[1]
            this.colorScaleCell = d3.scaleLinear().range([1,0]).domain([min_range,max_range])
            console.log('ALESSIA DOMINIO',this.colorScaleCell.domain())
        }
        this.render(obj.iteration)
        
    }

   
    
    this.updateVerticalLines = (obj,data_matrix) => {

        // ALESSIA POI BISOGNA METTERE LA FIXED MAYRI DELL?EARLY TERMINATION.
        
        verticalLines.map(d => {
            if(!d.draw) {
                if(Math.abs(this.lastObj[this.attibuteToCompareWithValue1]) <= d.threshold || Math.abs(this.lastObj[this.attibuteToCompareWithValue2]) <= d.threshold){   
                    d["draw"] = true
                    d["iteration"] = this.lastObj.iteration
                    //[X GIORGIO] MI SERVE LEGARMI A QUESTA FUNZIONE PER FOTOGRAFARE LO SCATTERPLOT O LA TABELLA
                    system.scatterplot.updateScatterplotEarlyTermination(obj.labels, obj.final_ars);
                    // qiui me ne disegna 3 perchè entra 3 volte in questo ciclo. 
                    // ALESSIA qui update della matrice 2
                    system.matrixAdjacencyFixed.updateMatrixplotEarlyTermination(partitions,data_matrix.runs_ars_matrix,data_matrix.runs_ami_matrix);
                    
                }

            }
        })
    }

    this.render = (it) => {
        this.div.selectAll('svg')
            .remove();
        
        const svg = this.div.append("svg")
          .attr("width", this.width + this.margin.left + this.margin.right)
          .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
            .attr("class", "gLineChart")
            
        if(this.data.length>40) {
            this.xScale = d3.scaleBand().domain([...Array(this.data.length+1).keys()]).range([0, this.width]).paddingInner(0.2).paddingOuter(0.2);//d3.scaleLinear().domain([0, this.data.length]).range([0, this.width]);
            this.xAxis = d3.axisBottom().scale(this.xScale);
        }

        svg.append("g")
            .attr("class", "x axisTimeline")
            .attr("transform", "translate(0," + this.height + ")")	
            .call(that.xAxis)
                .selectAll("text")	
                .style("text-anchor", "start")
                .attr("dx", "1em")
                .attr("dy", "-.40em")
                .attr("transform", "rotate(90)");
          
        // Add Y axis
        this.yScale = d3.scaleBand()
            .domain(Array.from({length:partitions},(_,i)=> 'P'+i).reverse())
            .range([this.height, 0])
            .paddingInner(0.1)
            .paddingOuter(0.1);


        svg.append("g")
            .attr("class", "y axisTimeline")
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

        //drawLegend()
        updateRendering()

        let resize = function () {
            that.width = parseInt(that.div.style("width")) - that.margin.left - that.margin.right,
            that.height = parseInt(that.div.style("height")) - that.margin.top - that.margin.bottom;
            that.xScale.range([0, that.width]);
            that.yScale.range([that.height, 0]);
            
            that.xAxis = d3.axisBottom().scale(that.xScale);
            //that.yAxis = d3.axisLeft().scale(that.yScale);
            that.yAxis = d3.axisLeft().scale(that.yScale)//.tickFormat(d3.format("~s"));      
            
            // Update the axis and text with the new scale
            svg.select(".x.axisTimeline")
                .attr("transform", "translate(0," + that.height + ")")
                .call(that.xAxis)
                .selectAll("text")	
                .style("text-anchor", "start")
                .attr("dx", "1em")
                .attr("dy", "-.40em")
                .attr("transform", "rotate(90)");
            
            svg.select(".y.axisTimeline").call(that.yAxis);

            svg.select(".textXAxis")             
                .attr("transform",
                    "translate(" + (that.width/2) + " ," + 
                                    (that.height + that.margin.top ) + ")")
                .style("text-anchor", "left")
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
            //.attr("transform", "translate(" + (that.width - that.margin.left) + ","+ that.margin.top + ")");

        /*var legendOrdinal = d3.legendColor()
            .shape("rect")
            .shapeWidth(5)
            .shapeHeight(5)
            .scale(ordinalScale);*/
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

    let parse_intertia_runs = (array_inertia, best_run) =>{
         console.log('ARRAY-INERTIA',best_run)
      let parsed_array_inertia = []
      for( let i = 0; i < array_inertia.length; i++){
        

        //console.log('....',array_inertia)
        //let partitios_inertia = array_inertia[i].split('::')
        for( let j = 0; j < array_inertia[0].length; j++){
          let single_object = [];
          //single_object['P'+j]= +partitios_inertia[j]
          single_object.push(i)
          single_object.push('P'+j)
          single_object.push(+array_inertia[i][j])
          single_object.push('P'+best_run[i])// better partition
          single_object.push(array_inertia[i][best_run[i]]) // better inertia che sarebbe d[4]
          
          parsed_array_inertia.push(single_object)
        }
        
      }

      //console.log(parsed_array_inertia)
      // this give a an array of array where each element is [iteration, partition, inertia_value]
      return parsed_array_inertia;
    }

    let updateRendering = () => {

        //parse_intertia_runs(this.data.map(d=>d.runs_inertia))
        console.log(this.data.map(d => d.info.best_run))
        // DATI CELLE
        // d[0] iteratione
        // d[1] partizione
        // d[2] valore inertia
        // d[3] best run
        // d[4] best valore inertia
        that.div.select("g.gLineChart")
            .selectAll('rect.rect-partition')
            .data(parse_intertia_runs(this.data.map(d=> d.metrics.partitionsMetrics.inertia),this.data.map(f => f.info.best_run)))
            .each()
            .join(
                enter => enter
                    .append("rect")
                    .attr('class', 'rect-partition')
                    .attr('id', (d) => 'timeline-'+d[0]+'-'+d[1])
                    .attr('x', (d)=>  that.xScale(d[0]))
                    .attr('y', d=> that.yScale(d[1]))
                    .attr('width', that.xScale.bandwidth())
                    .attr('height',that.yScale.bandwidth())
                    .attr('fill',d=> { 
                        if(d[0]<5) {
                            return d3.interpolateGreys(this.colorScaleCell(d[2]))
                        } else {
                            console.log(d[2],this.colorScaleCell.domain()[0]);
                            return d3.interpolateGreens(this.colorScaleCell(d[2]))
                            }
                        })
                    .attr('stroke',(d)=> {
                        if(d[3] === d[1]) { return '#ff0090'}
                        else if((d[2] - d[4] <= d[4]*0.01) && (d[3] !== d[1])){ 
                            return "#ff9d47"
                        }
                        })
                    .attr('stroke-width',(d)=> {
                        if(d[3] === d[1]) { 
                            return '1'
                        } else if((d[2] - d[4] <= d[4]*0.01) && (d[3] !== d[1])){ 
                            return '1'
                        }
                        })
                  ,
                update => update
                  .attr('x', (d)=>  that.xScale(d[0]))
                  .attr('y', d=> that.yScale(d[1]))
                  .attr('width', that.xScale.bandwidth())
                  .attr('height',that.yScale.bandwidth())
                  .attr('fill','black'),
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