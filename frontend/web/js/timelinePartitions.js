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
    this.partitions_status = null
    this.metric_value = null
    this.labelYAxis = 'partitions'
    this.DOMAINS = null
    this.MAX_METRIC = null
    this.MIN_METRIC = null
    this.METRICA_LABELING = 'simplifiedSilhouette';
    this.ITERATION_LAST = null
    this.BEST_RUN = null
    this.percentage_similarity= null;

    
    this.init = (idDiv, tech, numPart) => {
        this.div = d3.select(idDiv)

    
        this.div.selectAll('svg')
            .remove();


        this.matrix_width = d3.min([parseInt(d3.select('#id-matrix-1').style("width")),parseInt(d3.select('#id-matrix-1').style("height"))])- this.margin_matrix.left - this.margin_matrix.right;
        this.matrix_height = d3.min([parseInt(d3.select('#id-matrix-1').style("width")),parseInt(d3.select('#id-matrix-1').style("height"))])- this.margin_matrix.top - this.margin_matrix.bottom;
        this.all_cell = (d3.min([this.matrix_width,this.matrix_height])-this.margin_matrix.top)
        this.matrix_cell_size = (d3.min([this.matrix_width,this.matrix_height])-this.margin_matrix.top)/partitions
        this.partitions_status=Array.from({length:partitions},(_,i)=> [0,'P'+i,true])
        this.metric_value = $('input[name="metric-timeline"]:checked').val();
        this.percentage_similarity = +$('#similarity-range').val()
        d3.select('#information-linechart').style('visibility','visible');

        
        this.DOMAINS = {inertia: [0,0], simplifiedSilhouette: [-1,1]}
        
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
        this.metric_value = $('input[name="metric-timeline"]:checked').val();
        this.MAX_METRIC = d3.max(data[0].metrics.partitionsMetrics[that.metric_value]);
        this.MIN_METRIC = 0;
        this.ITERATION_LAST = Array.from({length:partitions},(_)=> 0)
        // inizializzo la scala per inertia e per l'altra, che poi aggiorno qualora non andasse bene. 

        this.DOMAINS['inertia'][0] = d3.max(data[0].metrics.partitionsMetrics['inertia'])
        this.DOMAINS['inertia'][1] = d3.max(data[0].metrics.partitionsMetrics['inertia']);

        this.DOMAINS[this.METRICA_LABELING][0] = 1
        this.DOMAINS[this.METRICA_LABELING][1] = -1;
        
        if (this.metric_value === 'inertia'){
            this.colorScaleCell = d3.scaleLinear()
                .range([1,0])
                .domain(
                    [0, this.DOMAINS['inertia'][1]])
            }

        if (this.metric_value === this.METRICA_LABELING) {
            this.colorScaleCell = d3.scaleLinear()
                .range([0,1])
                .domain([-1,1])
        }
    
    }

    
    this.updateData = (obj,data_matrix) => {
        this.data = this.data.concat(obj)

        this.ITERATION_LAST = obj.info.runs_iterations
        this.BEST_RUN =  obj.info.best_run
        
        // UPDATE THE domain of the dynamic scale
        if (d3.min(obj.metrics.partitionsMetrics['inertia']) < this.DOMAINS['inertia'][0]){
            this.DOMAINS['inertia'][0] = d3.min(obj.metrics.partitionsMetrics['inertia'])
        }
        if (d3.max(obj.metrics.partitionsMetrics['inertia']) > this.DOMAINS['inertia'][1]){
            this.DOMAINS['inertia'][1] = d3.max(obj.metrics.partitionsMetrics['inertia'])
        }
        if (d3.min(obj.metrics.partitionsMetrics[this.METRICA_LABELING]) < this.DOMAINS[this.METRICA_LABELING][0]){
            this.DOMAINS[this.METRICA_LABELING][0] = d3.min(obj.metrics.partitionsMetrics[this.METRICA_LABELING])
        }
        if (d3.max(obj.metrics.partitionsMetrics[this.METRICA_LABELING]) > this.DOMAINS[this.METRICA_LABELING][1]){
            this.DOMAINS[this.METRICA_LABELING][1] = d3.max(obj.metrics.partitionsMetrics[this.METRICA_LABELING])
        }


        // change the domain to the scale
        if (obj.iteration === 5 || d3.min(obj.metrics.partitionsMetrics[that.metric_value]) < this.colorScaleCell.domain()[0] || d3.max(obj.metrics.partitionsMetrics[that.metric_value])> this.colorScaleCell.domain()[1]){
            
            if(d3.min(obj.metrics.partitionsMetrics[that.metric_value]) < this.colorScaleCell.domain()[0]){
                this.DOMAINS[that.metric_value][0] = d3.min(obj.metrics.partitionsMetrics[that.metric_value]) - (d3.min(obj.metrics.partitionsMetrics[that.metric_value]))*0.05
            }
            if(d3.max(obj.metrics.partitionsMetrics[that.metric_value])> this.colorScaleCell.domain()[1]){
                this.DOMAINS[that.metric_value][1] = d3.max(obj.metrics.partitionsMetrics[that.metric_value]) + (d3.max(obj.metrics.partitionsMetrics[that.metric_value]))*0.05
            }
            //let max_range = this.colorScaleCell.domain()[1]
            if (this.metric_value === 'inertia'){
                this.colorScaleCell = d3.scaleLinear()
                    .range([1,0])
                    .domain([this.DOMAINS[this.metric_value][0], this.DOMAINS[this.metric_value][1]])
                }
            if (this.metric_value === this.METRICA_LABELING) {
                this.colorScaleCell = d3.scaleLinear()
                    .range([0,1])
                    .domain([this.DOMAINS[this.metric_value][0], this.DOMAINS[this.metric_value][1]])
            }
        }
        that.partitions_status.forEach((e)=> {
            if(e[2]){
                e[0] = obj.iteration
            }
        })

        console.log('****',this.DOMAINS[this.METRICA_LABELING])
        this.render(obj.iteration)
    }

    this.reset = () => {
        d3.select('#information-linechart').style('visibility','hidden');
        
    }
   
    
    this.render = () => {
        this.div.selectAll('svg')
            .remove();
        
        const svg = this.div.append("svg")
          .attr("width", this.width + this.margin.left + this.margin.right)
          .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
            .attr("class", "gTimeLine")
            
        if(this.data.length>40) {
            this.xScale = d3.scaleBand().domain([...Array(this.data.length+1).keys()]).range([0, this.width]).paddingInner(0.2).paddingOuter(0.2);//d3.scaleLinear().domain([0, this.data.length]).range([0, this.width]);
            this.xAxis = d3.axisBottom().scale(this.xScale);
        }
        
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
            
        svg.append("g")
            .attr("class", "y axisTimeline")
            .call(this.yAxis)
        
        //labels
        svg.append("text")
            .attr("class", "textXAxis")            
            .attr("transform",
                  "translate(" + (this.width/2) + " ," + 
                                 (this.height + this.margin.top + this.margin_bottom - (this.margin_top) ) + ")")
            .style("text-anchor", "middle")
            .text("Iterations");

            d3.select('.y.axisTimeline')
                .selectAll("rect-chechbox")
                .data(that.partitions_status)
                .each()
                .join(
                    enter => enter
                        .append("rect")
                        .attr('id',(d) => 'checkbox-'+d[1])
                        .attr('x', 0 - (this.margin.left/3)*2)
                        .attr('y',(d,i) => that.yScale(d[1]) + (that.yScale.bandwidth()/2) -5 )
                        .attr('width',() => {if(that.yScale.bandwidth()<=10) return that.yScale.bandwidth(); else return 10;})
                        .attr('height',() => {if(that.yScale.bandwidth()<=10) return that.yScale.bandwidth(); else return 10;})
                        .attr('fill',(d)=> {if(d[2]) return '#000'; else { return '#fff';}})
                        .attr('stroke-width',3)
                        .attr('stroke',(d)=> {if(d[2]) return '#000'; else {return'#6C757D'}})
                        .on('click',function(d){
                            
                            let index_checkbox = parseInt(d3.select(this).attr('id').replace('checkbox-P',''))
                            
                            if (that.partitions_status[index_checkbox][2]){
                                that.partitions_status[index_checkbox][2] = false
                                
                                d3.select(this)
                                .attr('fill','#fff')
                                .attr('stroke-width',3)
                                .attr('stroke','#6C757D')
                            }
                        }),
                    update => update
                        .attr('fill','green'),
                    exit=> exit)

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

    let parse_intertia_runs = (all_data, array_inertia, best_run) =>{
        
      
        let parsed_array_inertia = []
        for( let i = 0; i < array_inertia.length; i++){ // i iterazione
        for( let j = 0; j < array_inertia[0].length; j++){ // j la partizione
            let single_object = [];
            let object_for_brush = new Object();
            Object.keys(all_data[i].metrics.partitionsMetrics).forEach(function(key) {

                /*if (key === 'entriesStability' || key === 'globalStability') {
                    object_for_brush[key]= all_data[i].metrics.partitionsMetrics[key][j];
                } else {*/
                object_for_brush[key]= all_data[i].metrics.partitionsMetrics[key][j];
                //}
                
            });
            //single_object['P'+j]= +partitios_inertia[j]
            single_object.push(i)
            single_object.push('P'+j)
            single_object.push(+array_inertia[i][j])
            single_object.push('P'+best_run[i])// better partition
            single_object.push(array_inertia[i][best_run[i]]) // better inertia che sarebbe d[4]
            single_object.push(object_for_brush) // object for brush
            
            parsed_array_inertia.push(single_object)
            }
            
        }
        return parsed_array_inertia;
    }

    this.updateMetricValue = () => {
        that.metric_value = $('input[name="metric-timeline"]:checked').val();

        if (this.metric_value === 'inertia'){
            this.colorScaleCell = d3.scaleLinear()
                .range([1,0])
                .domain([this.DOMAINS[this.metric_value][0], this.DOMAINS[this.metric_value][1]])
            }

        if (this.metric_value === this.METRICA_LABELING) {
            this.colorScaleCell = d3.scaleLinear()
                .range([0,1])
                .domain([this.DOMAINS[this.metric_value][0], this.DOMAINS[this.metric_value][1]])
        }
        system.timelinepartitions.render();
    }

    let updateRendering = () => {
        // DATI CELLE
        // d[0] iteratione
        // d[1] partizione
        // d[2] valore metrica
        // d[3] best run
        // d[4] best valore metrica
        // d[5] altre metriche
        that.div.select("g.gTimeLine")
            .selectAll('rect.rect-partition')
            .data(parse_intertia_runs(this.data,this.data.map(d=> d.metrics.partitionsMetrics[that.metric_value]),this.data.map(f => f.info.best_run)))
            .join(
                enter => enter
                    .append("rect")
                    .attr('class', 'rect-partition')
                    .attr('id', (d) => 'timeline-'+d[0]+'-'+d[1])
                    .attr('x', (d)=>  that.xScale(d[0]))
                    .attr('y', d=> that.yScale(d[1]))
                    .attr('width', that.xScale.bandwidth()*0.90)
                    .attr('height',that.yScale.bandwidth()*0.70)
                    .attr('fill',d=> { 
                        if(d[0]<5) {
                            return d3.interpolateGreys(this.colorScaleCell(d[2]))
                        } else {
                            if(that.metric_value === 'inertia'){
                                return d3.interpolateGreens(this.colorScaleCell(d[2]));
                            }
                            if (this.metric_value === this.METRICA_LABELING){
                                return d3.interpolateReds(this.colorScaleCell(d[2]));
                            }
                        }
                    })
                    .attr('stroke',(d)=> {
                        if(d[3] === d[1]) { 
                            
                            if(that.metric_value === 'inertia'){
                                return '#ff0090'
                            }
                            if (this.metric_value === this.METRICA_LABELING){
                                return '#0094db'
                            }
                        }
                        else if((d[2] - d[4] <= d[4]*(that.percentage_similarity/100)) && (d[3] !== d[1])){ 
                            if(that.metric_value === 'inertia'){
                                return "#ffff16" //"#ff9d47"
                            }
                        }
                        })
                    .attr('stroke-width',(d)=> {
                        if(d[3] === d[1]) { 
                            return '1'
                        } else if((d[2] - d[4] <= d[4]*(that.percentage_similarity/100)) && (d[3] !== d[1])){ 
                            return '1'
                        }
                        })
                    .attr('visibility', (d)=> {
                        let current_i = parseInt(d[1].replace('P',''))
                        if (d[0]>that.ITERATION_LAST[current_i]|| that.partitions_status[current_i][0]<=d[0]) //if(that.partitions_status[current_i][0]<d[0])
                            return 'hidden';
                        else
                            return 'visible';
                        })
                    .style('opacity', (d)=> {
                            let current_index = parseInt(d[1].replace('P',''))
                            if(that.partitions_status[current_index][2])
                                return 1;
                            else
                                return 0;
                            })
                    .on('click', function(){
                        d3.selectAll('rect.rect-partition')
                        .attr('width', that.xScale.bandwidth()*0.90)
                        .attr('height',that.yScale.bandwidth()*0.70)
                        d3.select(this)
                            .attr('width', that.xScale.bandwidth())
                            .attr('height',that.yScale.bandwidth())

                        console.log(d3.select(this))
                        console.log(d3.select(this).node())
                        let data_rect = d3.select(this).attr('id').split('-')
                        let iteration_clicked = +data_rect[1]
                        let partition_selected = +(data_rect[2].replace('P',''))
                        console.log(data_rect,iteration_clicked,partition_selected)
                        system.scatterplot.updateScatterplotFromTimeline(iteration_clicked,partition_selected);

                    })
                  ,
                update => update
                .attr('stroke',(d)=> {
                    if(d[3] === d[1]) { 
                        
                        if(that.metric_value === 'inertia'){
                            return '#ff0090'
                        }
                        if (this.metric_value === this.METRICA_LABELING){
                            return '#0094db'
                        }
                    }
                    else if((d[2] - d[4] <= d[4]*(that.percentage_similarity/100)) && (d[3] !== d[1])){ 
                        if(that.metric_value === 'inertia'){
                            return "#ffff16" //"#ff9d47"
                        }
                       
                        
                    }
                    })
                
                ,
                exit => exit
                    .call(exit => exit
                        .transition()
                        .duration(0)
                        .remove()
                    )
                )

                that.div.select("g.gTimeLine")
                .append('text')
                .attr('id','champion-icon')
                .attr('font-family', 'FontAwesome')
                .attr('x', that.xScale(that.ITERATION_LAST[that.BEST_RUN]+1))
                .attr('y', that.yScale('P'+that.BEST_RUN)+((that.yScale.step()/3)*2))
                .attr('font-size', 15)
                .attr('fill',()=>{
                    if(that.metric_value === 'inertia'){
                        return '#ff0090'
                    }
                    if (that.metric_value === that.METRICA_LABELING){
                        return '#0094db'
                    }
                })
                .text('\uf091' ); 
            
    }
    

    this.updateSimilarity = () =>{

        this.percentage_similarity = +$('#similarity-range').val()
        console.log($('#similarity-range').val());
        d3.select('#selected_similarity').html($('#similarity-range').val() + '%')
        updateRendering();
    }

    return this;
}).call({})