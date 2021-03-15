if (window.system == undefined) window.system = {}
system.matrixAdjacency = (function() {
    const that = this;
    

    // variable
    this.div = null
    this.data = []
    this.g=null

    this.width = null
    this.height =  null
    this.margin = null
    this.cell_size = null

    this.matrix = []
    
    this.init = function (idDiv){
      system.matrixAdjacency.reset();
      this.div = d3.select(idDiv)
      this.divname = idDiv
      this.g= idDiv+'-g-adiacency'
      this.margin = {top: 20, right: 20, bottom: 20, left: 40}
      
      this.width = d3.min([parseInt(this.div.style("width")),parseInt(this.div.style("height"))])- this.margin.left - this.margin.right;
      this.height = d3.min([parseInt(this.div.style("width")),parseInt(this.div.style("height"))])- this.margin.top - this.margin.bottom;
      
      return this
    } 

    this.setData = (data) => {
      this.data = data
    }

    this.getG = () => {
      return this.g;
    }

    this.reset = () => {
      d3.select(this.divname).selectAll("svg").remove();
    }

    this.adjacency = (partitions,decision_ars,decision_ami) => {
      console.log('ALESSIA funzione adjacency')
      
      let runs_ars_matrix = decision_ars //data.info.runs_ars_matrix//decision_ars.split("||").map(row => row.split("::").map(d => parseFloat(d))) //matrice size r*r
      let runs_ami_matrix = decision_ami //data.info.runs_ami_matrix//decision_ami.split("||").map(row => row.split("::").map(d => parseFloat(d))) //matrice size r*r  
        system.matrixAdjacency.createAdjacencyMatrix(partitions,runs_ars_matrix,runs_ami_matrix)
    }
    
    let updateData = () =>{
      //console.log(that.matrix)
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
        .style("fill", d => d3.interpolateBlues(d.weight))
        .attr("data-tippy-content", d => "" + d.id + " at row " + d.row + " end col " +d.col + " with weight " + d.weight)
        ,
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

      tippy(tooltRect.nodes(),{  delay: 300});
    }

    this.updateMatrix = (partitions,decision_ars,decision_ami) => {

      console.log('ALESSIA',decision_ars,decision_ami)
      
      let ARI = decision_ars//decision_ars.split("||").map(row => row.split("::").map(d => parseFloat(d))) //matrice size r*r
      let AMI = decision_ami//decision_ami.split("||").map(row => row.split("::").map(d => parseFloat(d))) //matrice size r*r  
      this.matrix = []
      
      let i;
      let j;
      for (i=0; i < parseInt(partitions); i++){
        for (j=0; j < parseInt(partitions); j++){
          var grid = {id: 'P'+i+"-"+'P'+j, row: 'P'+i, col: 'P'+j,x:i, y:j, weight: 0, metric: null};
          if(i<j){ // è la parte sotto della matrice, metto ARI 
            grid.weight = ARI[i][j];
            grid.metric = 'ARI';
          } else if(i>j){
            grid.weight = AMI[i][j];
            grid.metric = 'AMI';
          }
          this.matrix.push(grid)

        }
      }

      updateData();
    };


    this.createAdjacencyMatrix = (partitions,ARI,AMI) => {
      
      //console.log(ARI,AMI)
      this.matrix = []
      let nodes = []
      let i;
      let j;
      for (i=0; i < parseInt(partitions); i++){
        for (j=0; j < parseInt(partitions); j++){
          var grid = {id: 'P'+i+"-"+'P'+j, row: 'P'+i, col: 'P'+j,x:i, y:j, weight: 0, metric: null};
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

      //console.log('MATRICE', this.matrix)
      
      this.cell_size = (d3.min([that.width,that.height])-that.margin.top)/nodes.length
      
  
      console.log('WIDTH-WIDTH',this.width)
      console.log('WIDTH-HEIGHT',this.height)
    let svg = this.div
    .append("svg")
    .attr("width", this.width + this.margin.left + this.margin.right)
    .attr("height", this.height +  this.margin.top + this.margin.bottom)

    console.log('WIDTH-WIDTH',svg.attr('width'), this.margin.left)
    console.log('WIDTH-HEIGHT',svg.attr('height'),this.margin.top )

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
      .attr("class","label-matrix")
      .attr("id",d => 'row-' + d)
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
      .attr("class","label-matrix")
      .attr("id",d => 'col-' + d)
      .text(d => d)
      .style("text-anchor","end")
      .style("font-size","10px")  

      // labels metrix
      svg
      .append("g")
      .attr("transform","translate(" + (that.margin.left+(that.width/2)-10) + "," + (that.height) + ")")
      .append("text")
      .text('ARI')
      .style("text-anchor","middle")
      .style("font-size","14px")
      
      
      svg
      .append("g").attr("transform","translate(" + (that.margin.left+that.width-2) + "," + ((that.height/2)-10)+ ")")      
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
      .attr("id", "gradient")
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
      .style("fill", "url(#gradient)")
      

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

    this.updateBestPartition = (best)=>{
      d3.selectAll('.label-matrix')
        .style('fill','black')
        .style('font-weight','normal')
      
      d3.select('#col-P'+best)
        .style('fill','red')
        .style('font-weight','bold')
      d3.select('#row-P'+best)
        .style('fill','red')
        .style('font-weight','bold')
      //col-P7
    }
    
    return this;
}).call({})