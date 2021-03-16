if (window.system == undefined) window.system = {}
system.timelinepartitions = (function() {
    const that = this;

    // variable
    this.div = null
    this.data = []
    this.segmentedData = []
    
    this.divName = null
    this.margin = { top: 20, right: 30,bottom: 20, left: 60 }
    this.margin_matrix =  {top: 20, right: 20, bottom: 20, left: 40}
    this.matrix_cell_size = null
    this.matrix_width = null
    this.matrix_height = null
    this.all_cell = null

    this.width = null
    this.height = null
    this.height_like_matrix = null
    this.xScale = null
    this.yScale = null
    this.xAxis = null
    this.yAxis = null
    this.colorScaleCell = null

    this.labelYAxis = 'partitions'
    
    this.init = (idDiv, tech, numPart) => {
        this.div = d3.select(idDiv)
        console.log('idDiv', idDiv)
    
        this.div.selectAll('svg')
            .remove();

        console.log('SUSHI FIX',this.height_like_matrix)
        this.matrix_width = d3.min([parseInt(d3.select('#id-matrix-1').style("width")),parseInt(d3.select('#id-matrix-1').style("height"))])- this.margin_matrix.left - this.margin_matrix.right;
        this.matrix_height = d3.min([parseInt(d3.select('#id-matrix-1').style("width")),parseInt(d3.select('#id-matrix-1').style("height"))])- this.margin_matrix.top - this.margin_matrix.bottom;
        this.all_cell = (d3.min([this.matrix_width,this.matrix_height])-that.margin_matrix.top)
        this.matrix_cell_size = (d3.min([this.matrix_width,this.matrix_height])-that.margin_matrix.top)/partitions
        
     
        this.divName = idDiv
        this.width = parseInt(this.div.style("width")) - this.margin.left - this.margin.right,
        this.height = parseInt(this.div.style("height")) - this.margin.top - this.margin.bottom;
        //this.height_like_matrix = system.matrixAdjacencyFixed.cell_size
        this.xScale = d3.scaleBand().domain([...Array(40).keys()]).range([0, this.width]).paddingInner(0.2).paddingOuter(0.2);//d3.scaleLinear().domain([0, 40]).range([0, this.width]);
        this.yScale = d3.scaleBand().domain(Array.from({length:partitions},(_,i)=> 'P'+i).reverse()).range([(this.all_cell), 0]).paddingInner(0.1).paddingOuter(0.1);//d3.scaleLinear().range([this.height, 0]);
        this.xAxis = d3.axisBottom().scale(this.xScale);
        this.yAxis = d3.axisLeft().scale(this.yScale)//.tickFormat(d3.format("~s"));   
        
        return that
    } 

    this.setData = (data) => {
        this.data = data
        this.colorScaleCell = d3.scaleLinear()
            .range([1,0])
            .domain(
                [0, d3.max(data[0].metrics.partitionsMetrics.inertia)])
        }

    
    this.updateData = (obj,data_matrix) => {
        this.data = this.data.concat(obj)
        
        if (obj.iteration === 5 || d3.min(obj.metrics.partitionsMetrics.inertia) < this.colorScaleCell.domain()[0]){
            let min_range = d3.min(obj.metrics.partitionsMetrics.inertia) - (d3.min(obj.metrics.partitionsMetrics.inertia))*0.05
            let max_range = this.colorScaleCell.domain()[1]
            this.colorScaleCell = d3.scaleLinear().range([1,0]).domain([min_range,max_range])
        }
        this.render(obj.iteration)
        
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
        console.log('SUSHI',that.all_cell)
        svg.append("g")
            .attr("class", "x axisTimeline")
            .attr("transform", "translate(0," + (that.all_cell)+ ")")	
            .call(that.xAxis)
                .selectAll("text")	
                .style("text-anchor", "start")
                .attr("dx", "1em")
                .attr("dy", "-.40em")
                .attr("transform", "rotate(90)");
          
        // Add Y axis
        this.yScale = d3.scaleBand()
            .domain(Array.from({length:partitions},(_,i)=> 'P'+i).reverse())
            .range([that.all_cell, 0])
            .paddingInner(0.1).paddingOuter(0.1);
            //.paddingInner(0.1)
            //.paddingOuter(0.1);


        svg.append("g")
            .attr("class", "y axisTimeline")
            .call(this.yAxis)
        
        //labels
        svg.append("text")
            .attr("class", "textXAxis")            
            .attr("transform",
                  "translate(" + (this.width/2) + " ," + 
                                 (this.height + this.margin.top + this.margin_bottom - (this.margin_bottom/2) ) + ")")
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
            that.yScale.range([that.all_cell, 0]);
            
            that.xAxis = d3.axisBottom().scale(that.xScale);
            //that.yAxis = d3.axisLeft().scale(that.yScale);
            that.yAxis = d3.axisLeft().scale(that.yScale)//.tickFormat(d3.format("~s"));      
            
            // Update the axis and text with the new scale
            svg.select(".x.axisTimeline")
                .attr("transform", "translate(0," + that.all_cell+ ")")
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