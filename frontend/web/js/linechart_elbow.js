
/**
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
                let allKActualDataset = new Set(onlyDataActualDataset.map(d => d.cluster))
                allKActualDataset.forEach(d=> {
                    let value = d3.min(onlyDataActualDataset.filter(ele => ele.cluster == d).map(ele => ele.fastInertia))
                    elbowData.push({k: d, value: value})
                })

                linechart_Elbow1.setData(elbowData)
                linechart_Elbow1.render()
            }else{
                linechart1.render()
            }
        }


document.getElementById('elbowLinechartCheck').checked = false
elbowLinechart = document.getElementById('elbowLinechartCheck').checked

/**
 *         <div class="form-check">
          <input class="form-check-input linechart_select" type="checkbox" id="elbowLinechartCheck" onclick="changeElbowLinechart()">
          <label class="form-check-label linechart_select" for="elbowLinechartCheck">
            Elbow
          </label>
        </div>

        <script src="./web/js/linechart_elbow.js"></script>
 */

if (window.system == undefined) window.system = {}
system.linechartElbow = (function() {
    const that = this;
    
    // variable
    this.div = null
    this.data = []
    this.segmentedData = []
    
    this.divName = null
    this.margin = { top: 35, right: 30, bottom: 50, left: 60 }
    this.width = null
    this.height = null
    this.xScale = null
    this.yScale = null
    this.xAxis = null
    this.yAxis = null
    // Define lines
    this.line = d3.line()
    
    this.init = (idDiv) => {
        this.div = d3.select(idDiv)
        this.divName = idDiv
        this.width = parseInt(this.div.style("width")) - this.margin.left - this.margin.right,
        this.height = parseInt(this.div.style("height")) - this.margin.top - this.margin.bottom;
        this.xScale = d3.scaleLinear().domain([2,20]).range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);
        this.xAxis = d3.axisBottom().scale(this.xScale);
        this.yAxis = d3.axisLeft().scale(this.yScale).tickFormat(d3.format("~s"));        
        this.line = d3.line()
            .curve(d3.curveMonotoneX)
            .x(function(d) {
                return that.xScale(d.k);
            })
            .y(function(d) {
                return that.yScale(Math.abs(+d.value));
            });
        return that
    } 

    this.setData = (data) => {
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
     
    /*this.updateData = (obj) => {
        this.data = this.data.concat(obj)
        this.segmentData(this.data)
        this.render()
    }*/

    this.render = () => {
        this.div.selectAll('svg')
            .remove();
        
        const svg = this.div.append("svg")
          .attr("width", this.width + this.margin.left + this.margin.right)
          .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
            .attr("class", "gLineChart")
            
        svg.append("g")
            .attr("class", "x axisLineChart")
            .attr("transform", "translate(0," + this.height + ")")
            .call(this.xAxis);
          
        // Add Y axis
        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, function(d) { return Math.abs(+d.value); })])
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
            .text("K");
        
        svg.append("text")
            .attr("class", "textYAxis")   
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margin.left)
            .attr("x",0 - (this.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("inertia");  

        updateRendering()
    }

    let updateRendering = () => {
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