if (window.system == undefined) window.system = {}
system.matrixAdjacencyFixed = (function() {
    const that = this;
    

    // variable
    this.div = null
    this.data = []
    this.g=null

    this.width = null
    this.height =  null
    this.margin = {top: 20, right: 20, bottom: 20, left: 40}
    this.cell_size = null
    this.divname = null;
    this.matrix = []
    this.early_termination = null;
    
    this.init = function (idDiv){
      system.matrixAdjacencyFixed.reset();
      console.log("SONO MATRICE 2",idDiv)
      this.g= idDiv+'-g-adiacency';
      this.divname = idDiv;
      this.div = d3.select(idDiv)
      this.divSelected = idDiv;

      
      this.width = d3.min([parseInt(d3.select('#id-matrix-1').style("width")),parseInt(d3.select('#id-matrix-1').style("height"))])- this.margin.left - this.margin.right;
      this.height = d3.min([parseInt(d3.select('#id-matrix-1').style("width")),parseInt(d3.select('#id-matrix-1').style("height"))])- this.margin.top - this.margin.bottom;
      
      console.log('SUSHI-WIdth-2',this.width)
      console.log('SUSHI-Height-2',this.height)

      return this
    } 

    this.setData = (data) => {
      this.data = data
    }

    this.reset = () => {
      this.early_termination = null;
      d3.select(this.divname).selectAll("svg").remove();
    }

    this.updateMatrixplotEarlyTermination= (partitions,decision_ars,decision_ami)=> {

      if ( this.early_termination == null){
        let runs_ars_matrix =decision_ars
        let runs_ami_matrix =decision_ami
       system.matrixAdjacencyFixed.createAdjacencyMatrix(partitions,runs_ars_matrix,runs_ami_matrix)
        this.early_termination = true;
      }
    }

    this.adjacency = (partitions,decision_ars,decision_ami) => {
      let runs_ars_matrix = decision_ars
      let runs_ami_matrix = decision_ami
      system.matrixAdjacencyFixed.createAdjacencyMatrix(partitions,runs_ars_matrix,runs_ami_matrix)
    }
    
    let updateData = () =>{
      let tooltRect = d3.select(this.g)
      .selectAll("rect")
      .data(that.matrix)
      .join(
        enter => enter.append("rect")
        .attr("class",(d)=> {return "grid col_"+d.col+ " row_" + d.row})
        .attr("id",(d)=> {return "id-"+d.col+ "-" + d.row+ "-" +d.metric+"-"+d.weight})
        .attr("width",that.cell_size)
        .attr("height",that.cell_size)
        .attr("x", d=> d.x*that.cell_size)
        .attr("y", d=> d.y*that.cell_size)
        .style("fill", d => d3.interpolateBlues(d.weight))//('#4E0560'
        .attr("data-tippy-content", d => "" + d.id + " at row " + d.row + " end col " +d.col + " with weight " + d.weight),
        update => update
        .call(update => update
          .transition()
          .duration(500)
          .style("fill", d => d3.interpolateBlues(d.weight))
        ),
        exit => exit
          .call(exit => exit
              .transition()
              .duration(650)
              .remove()
          )
      )

      tippy(tooltRect.nodes(),{  delay: 300,});
    }

    
      this.createAdjacencyMatrix = (partitions,ARI,AMI) => {
      
      this.matrix = []
      let nodes = []
      let i;
      let j;
      for (i=0; i < parseInt(partitions); i++){
        for (j=0; j < parseInt(partitions); j++){
          var grid = {id: 'ETP'+i+"-"+'P'+j, row: 'ETP'+i, col: 'ETP'+j,x:i, y:j, weight: 0, metric: null};
          if(i<j){ // è la parte sotto della matrice, metto ARI 
            grid.weight = ARI[i][j];
            grid.metric = 'ARI';
          } else if(i>j){
            grid.weight = AMI[i][j];
            grid.metric = 'AMI';
          }
          this.matrix.push(grid)
        }
        nodes.push('P'+i)
      }
      this.cell_size = (d3.min([that.width,that.height])-that.margin.top)/nodes.length
      
      
  
    let svg = this.div
    .append("svg")
    .attr("width", this.width + this.margin.left + this.margin.right)
    .attr("height", this.height +  this.margin.top + this.margin.bottom)

    svg.append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .attr("id",this.g.replace('#',''))

      updateData();
      
      svg
      .append("g")
      .attr("transform","translate(" + that.margin.left + "," + (that.margin.top-5) + ")")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("x", (d,i) => i * this.cell_size + (this.cell_size/2))
      .text(d => d)
      .style("text-anchor","middle")
      .style("font-size","10px")
      
      
      svg
      .append("g").attr("transform","translate(" + (that.margin.left-5) + "," + that.margin.top + ")")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("y",(d,i) => i * this.cell_size + ((this.cell_size/3)*2))
      .text(d => d)
      .style("text-anchor","end")
      .style("font-size","10px")  
      
      // label delle metriche 
      svg
      .append("g")
      .attr("transform","translate(" + (that.margin.left+(that.width/2)-10) + "," + (that.height) + ")")
      .append("text")
      .text('ARI')
      .style("text-anchor","middle")
      .style("font-size","14px")
      
      
      svg
      .append("g").attr("transform","translate(" + (that.margin.left+that.width-2) + "," + ((that.height/2) -10)+ ")")  
      .append("text")
      .text('AMI')
      .style("text-anchor","end")
      .style("font-size","14px") 
      .attr("transform", "rotate(-90)")

      // sequential legend
      let legend = svg
      .append("g")
      .attr("transform","translate(" + (that.margin.left) + "," + (that.height) + ")")
      .append("defs")
      .append("svg:linearGradient")
      .attr("id", "gradient-fixed")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "100%")
      .attr("y2", "100%")
      .attr("spreadMethod", "pad");

    legend.append("stop")
      .attr("offset", "0%")
      .attr("stop-color",  d3.interpolateBlues(0))
      .attr("stop-opacity", 1);

    legend.append("stop")
      .attr("offset", "33%")
      .attr("stop-color",  d3.interpolateBlues(0.33))
      .attr("stop-opacity", 1);

    legend.append("stop")
      .attr("offset", "66%")
      .attr("stop-color", d3.interpolateBlues(0.66))
      .attr("stop-opacity", 1);

    legend.append("stop")
      .attr("offset", "100%")
      .attr("stop-color",  d3.interpolateBlues(1))
      .attr("stop-opacity", 1);

    svg
    .append("g")
      .attr("transform","translate(" + (that.margin.left) + "," + (that.height+5) + ")")
      .append("rect")
      .attr("width", this.cell_size*partitions)
      .attr("height", 5)
      .style("fill", "url(#gradient-fixed)")
      

    var y = d3.scaleLinear()
      .range([this.cell_size*partitions, 0])
      .domain([1, 0]);

    var yAxis = d3.axisBottom()
      .scale(y)
      .ticks(5);

    svg.append("g")
      .attr("class", "y axis")
      .attr("transform","translate(" + (that.margin.left) + "," + (that.height+10) + ")")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("axis title");
}
    
    return this;
}).call({})