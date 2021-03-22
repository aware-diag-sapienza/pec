if (window.system == undefined) window.system = {}
system.scatterplot = (function() {
    const that = this;

  this.plotDigitIndex = null;
  this.width = null;
  this.height = null;
  this.margin = {top: 5, right: 10, bottom: 5, left: 10}
  this.coordData = null;
  this.tot_rows = 5000;
  this.start_computation = null;
  this.scale_label = d3.scaleOrdinal(d3.schemeCategory10);

  this.scale_color = ['#3366cc', '#dc3912','#ff9900','#109618','#d6616b','#990099','#0099c6','#dd4477','#66aa00','#b82e2e','#17becf','#bcbd22','#9467bd','#8c564b','#e377c2','#759EF1','#FFD40B','#52DA2E','#0ED1E3','#0C292B','#697374']
  this.scale_color_stability = ['#9e9ac8','#3f007d']//['#dadaeb','red','#bcbddc', '#9e9ac8','#807dba','#6a51a3','#4a1486']
  this.scale_color_stability_linear = d3.scaleThreshold().domain([0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.9,0.99])
  .range(['#fcfbfd','#efedf5','#dadaeb','#bcbddc','#9e9ac8','#807dba','#6a51a3','#54278f','#3f007d']);
  this.tensorResultComputation= {};
  this.datasetComputed = [];
  this.LABEL_EARLY_TERMINATION = [];

  let stage;
  let layer;
  let nodes = [];
  let tooltipLayer;


  let tooltip;

  this.scale_x = null
  this.scale_y = null
  this.readCsv = null
  this.coordinates = null;
  this.first_iteration = true;

  this.early_termination = null;

  function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }


  this.reset = () => {

    nodes = []
    this.start_computation = null
    this.scale_x = null
    this.scale_y = null
    this.readCsv = null
    this.coordinates = null
    this.early_termination = null
    this.first_iteration = true
    this.LABEL_EARLY_TERMINATION = [];

    d3.select('#information-info').html("")
    d3.select('.item-information').style('visibility','hidden');
    d3.selectAll('.scatter')
      .style('border-style', 'solid')
      .style('border-width', '0px')
    d3.selectAll('.konvajs-content').remove('*');
  }

  this.initKonva =() => {
    this.width = document.getElementById('id-scatterplot-1').getBoundingClientRect().width
    this.height  = document.getElementById('id-scatterplot-1').getBoundingClientRect().height
    this.plotDigitIndex = new Int32Array(this.width*this.height);
    this.plotDigitIndex.fill(-1);

    stage = new Konva.Stage({
      container: 'id-scatterplot-1',
      width: this.width-this.margin.left-this.margin.right,
      height: this.height-this.margin.top-this.margin.bottom,
    })
    layer = new Konva.Layer();
    stage.add(layer);
  }

  function setupTooltip() {
    tooltipLayer = new Konva.Layer();
    tooltip = new Konva.Label({
      opacity: 0.75,
      visible: false,
      listening: false
    });
    tooltip.add(new Konva.Tag({
      fill: 'black',
      pointerDirection: 'down',
      pointerWidth: 10,
      pointerHeight: 10
    }));
    tooltip.add(new Konva.Text({
      test: '',
      fontFamily: 'Calibri',
      fontSize: 18,
      padding: 5,
      fill: 'white'
    }));
    tooltipLayer.add(tooltip);
    stage.add(tooltipLayer);
    stage.on('mouseover mousemove', function(evt) {
      let node = evt.target;
      if(node) {
        let mousePos = node.getStage().getPointerPosition();
        tooltip.position({
          x: mousePos.x,
          y: mousePos.y - 5
        });
        tooltip.getText().setText(node.getId());
        if (node.getId()) {
          tooltip.show();
        } else {
          tooltip.hide();
        }
        tooltipLayer.batchDraw();
      }
    });
    stage.on('mouseout', function(evt) {
      tooltip.hide();
      tooltipLayer.draw();
    });
    let scaleBy = 1.05;
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      let oldScale = stage.scaleX();
  
      let mousePointTo = {
        x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
        y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
      };
  
      let newScale = e.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      stage.scale({ x: newScale, y: newScale });
  
      let newPos = {
        x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
        y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
      };
      for (let node of nodes) {
        let rad = node.getRadius();
        if (e.deltaY > 0) {
          node.setRadius(rad/scaleBy);
        }
        else {
          node.setRadius(rad * scaleBy);
        }
      }
      stage.position(newPos);
      stage.batchDraw();
    });
  }
this.updateScatterplot = ()=> {
  let labels;
  let stability;
  let PLOT_SCATTERPLOT = $('input[name="plot-scatterplot"]:checked').val();

  if (PLOT_SCATTERPLOT === 'cluster'){
    labels = ALL_DATA[CURRENT_ITERATION]['labels']
    stability = ALL_DATA[CURRENT_ITERATION]['labels'] // qui la stability la faccio come il cluster label
  }
  else {

    labels = ALL_DATA[CURRENT_ITERATION]['labels']
    stability= ALL_DATA[CURRENT_ITERATION].metrics.progressiveMetrics.entriesStability[stability_window]
  }

  plotCoordsKonva(that.tot_rows,'#b3b3b3',false,labels,stability)

}

this.updateScatterplotFromTimeline = (iteration, partition)=> {
  d3.select('#information-info').html("Partition P"+partition + "at iteration "+iteration)
    
  system.scatterplotFixed.updateScatterplot(false,true, that.scale_x,that.scale_y,ALL_DATA[iteration]['partitions'][partition]);//useScale,useColor, scaleX,ScaleY
}


this.updateScatterplotEarlyTermination= (labels,final_ars)=> {

  if ( this.early_termination === null){
    this.LABEL_EARLY_TERMINATION = labels;
    d3.select('#information-info').html("Early Termination Fast - " + $('#iteration-label').text() + '   <b>ARI<b/>: ' + final_ars.toFixed(4))
    system.scatterplotFixed.updateScatterplot(false,true, that.scale_x,that.scale_y,this.LABEL_EARLY_TERMINATION);//useScale,useColor, scaleX,ScaleY

  this.early_termination = true;
  }
}

function scaleClusterStability(metrica,cluster,stability){

  if(metrica == 'cluster'){
    
    return that.scale_color[+cluster]
  } else {
    if(stability <= 0.20){
      return '#a0a0a0'
    }
    if(stability > 0.20 && stability <= 0.80 ){
      return '#808080'
    }
    if(stability > 0.80){
      return that.scale_color[+cluster]
    }
  }
}

function scaleOpacityStability(metrica,cluster,stability){


  if(metrica == 'cluster'){
    return 1
  } else {
    if(stability <= 0.20){
      return 1
    }
    if(stability > 0.20 && stability <= 0.80 ){
      return 1
    }
    if(stability > 0.80){
      return 1
    }
  }
}


function plotCoordsKonva(numberPoints, col, useScale,labels,stability) {
  
  // first time create the points
  const kWidth = stage.width();
  const kHeight = stage.height();
  let PLOT_SCATTERPLOT = $('input[name="plot-scatterplot"]:checked').val();
  
  if (nodes.length === 0) {
    setupTooltip();
    for (let i = 0; i < that.tot_rows; i++) {
      
        const xcoord = Math.round((that.scale_x(that.coordData[i][0])))
        const ycoord = Math.round((that.scale_y(that.coordData[i][1])))
        
        let colorlabel;
        let opacitypoint;


        colorlabel = scaleClusterStability(PLOT_SCATTERPLOT,labels[i],stability[i])
        opacitypoint =  scaleOpacityStability(PLOT_SCATTERPLOT,labels[i],stability[i])
        
        let node = new Konva.Circle({
          x: xcoord,
          y: ycoord,
          radius: 3.5,
          fill: colorlabel,// + colStr,
          opacity:opacitypoint,
          id: 'i:' + i + '\nc: '+ labels[i] + ' ' + colorlabel + '\nx: '+xcoord +
          '\ny:' + ycoord
        });
        layer.add(node);
        nodes.push(node);    
    }
    
  } else {
    
    for (let i = 0; i < numberPoints; i++) {
      nodes[i].attrs.fill = scaleClusterStability(PLOT_SCATTERPLOT,labels[i],stability[i])
      nodes[i].attrs.opacity =  scaleOpacityStability(PLOT_SCATTERPLOT,labels[i],stability[i])
    }
  }
  layer.batchDraw();
  d3.selectAll('.scatter')
    .style('border-style', 'solid')
    .style('border-width', '1px')
}

function plotCoordsKonvaStability(labels) {
  // first time create the points
    let current_it = ALL_DATA.length -1
    for (let i = 0; i < nodes.length; i++) {
      const colorlabel = that.scale_color_stability[labels[i]];
      nodes[i].attrs.fill = colorlabel
  }
  
  layer.batchDraw();
  
  d3.selectAll('.scatter')
  .style('border-style', 'solid')
  .style('border-width', '1px')
}

 async function generateDataForScatterplot(dataset_projection,labelIteration,stability){

      that.tot_rows = dataset_projection.length
      
      system.scatterplotFixed.tot_rows = that.tot_rows
      
      let xs = []

      let first_feature = []
      let second_feature = []
      
      that.coordData = dataset_projection
      system.scatterplotFixed.coordData= dataset_projection
      
        for (let i = 0; i<that.tot_rows; i++) {
          let array0 = dataset_projection[i]
          first_feature.push(+array0[0])
          second_feature.push(+array0[1])
          xs = xs.concat(array0)
       }
        that.scale_x = d3.scaleLinear()
        .domain([d3.min(first_feature), d3.max(first_feature)])
        .range([10,stage.width()-10]);
        
        that.scale_y = d3.scaleLinear()
        .domain([d3.min(second_feature), d3.max(second_feature)])
        .range([10, stage.height()-10]);

      if(that.first_iteration){ 
        plotCoordsKonva(that.tot_rows, '#b3b3b3',true,labelIteration,stability);
        system.scatterplotFixed.updateScatterplot(true,false, that.scale_x,that.scale_y,labelIteration);//useScale,useColor, scaleX,ScaleY
        that.first_iteration = false
      } else {
        plotCoordsKonva(that.tot_rows, '#b3b3b3',true,labelIteration,stability);
        system.scatterplotFixed.updateScatterplot(true,true, that.scale_x,that.scale_y,labelIteration);//useScale,useColor, scaleX,ScaleY
      }
      
    }

    this.createData = (csvUrl, labelCluster) => {
      system.scatterplot.reset();
      system.scatterplotFixed.reset();
      system.scatterplot.initKonva();
      system.scatterplotFixed.initKonva();
      let PLOT_SCATTERPLOT = $('input[name="plot-scatterplot"]:checked').val();

      let stability_cluster;
      if (PLOT_SCATTERPLOT === 'cluster'){
        stability_cluster = labelCluster
      } else {
        
        stability_cluster = ALL_DATA[CURRENT_ITERATION].metrics.progressiveMetrics.entriesStability[stability_window]// = ALL_DATA[CURRENT_ITERATION].metrics.progressiveMetrics[PLOT_SCATTERPLOT]
        
      }

      generateDataForScatterplot(csvUrl,labelCluster,stability_cluster);

    }

    this.createDataProjection = (csvUrl, labelCluster) => {
      system.scatterplot.reset();
      system.scatterplotFixed.reset();
      system.scatterplot.initKonva();
      system.scatterplotFixed.initKonva();
      that.first_iteration = false;

      let stability_cluster;
      if (PLOT_SCATTERPLOT === 'cluster'){
        stability_cluster = labelCluster
      } else {
        //stability_cluster = ALL_DATA[CURRENT_ITERATION].metrics.progressiveMetrics[PLOT_SCATTERPLOT]
        stability_cluster= ALL_DATA[CURRENT_ITERATION].metrics.progressiveMetrics.entriesStability[stability_window]
      }

      generateDataForScatterplot(csvUrl,labelCluster,stability_cluster);

    }

    function displayTexture(gl, texture, diameter) {
      var framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      // Read the contents of the framebuffer
      var fdata = new Float32Array(diameter * diameter * 4);
      gl.readPixels(0, 0, diameter, diameter, gl.RGBA, gl.FLOAT, fdata);

      //gl.deleteFramebuffer(framebuffer);

      let color = 0;
      function getMax(prev, cur, ind) {
        if (ind%4 === color) {
          return (prev < cur) ? cur : prev;
        }
        return prev;
      }
      function getMin(prev, cur, ind) {
        if (ind%4 === color) {
          return (prev < cur) ? prev : cur;
        }
        return prev;
      }
      color = 0;
      const rangeMaxR = fdata.reduce(getMax, -1e6);
      const rangeMinR = fdata.reduce(getMin, 1e6);
      color = 1;
      const rangeMaxG = fdata.reduce(getMax, -1e6);
      const rangeMinG = fdata.reduce(getMin, 1e6);
      color = 2;
      const rangeMaxB = fdata.reduce(getMax, -1e6);
      const rangeMinB = fdata.reduce(getMin, 1e6);

      const rData = new Int32Array(diameter * diameter * 4);
      const bData = new Int32Array(diameter * diameter * 4);
      const gData = new Int32Array(diameter * diameter * 4);
      const rgbData = [rData, bData, gData];
      const rgbMins =[rangeMinR, rangeMinG, rangeMinB];
      const rgbMaxs =[rangeMaxR, rangeMaxG, rangeMaxB];

      // split and scale the first three components
      for (let i = 0; i < diameter * diameter * 4; i++) {
        const colIdx = i%4;
        const pixIdx = Math.floor(i/4) * 4;
        if (colIdx < 3) {
          let val = 0;
          if (colIdx > 0) {
            val = Math.floor(255 * fdata[i] / (rgbMaxs[colIdx] - rgbMins[colIdx]));
          } else {
            val = Math.floor(255 * fdata[i] / rgbMaxs[colIdx]);
          }
          if (colIdx === 0) {
            // svalues are 0 - 255 range
            rgbData[colIdx][pixIdx] = 255;
            rgbData[colIdx][pixIdx + 1] = 255 - val;
            rgbData[colIdx][pixIdx + 2] = 255 - val;
          }
          if (colIdx === 1 || colIdx == 2) {
            // Vx Vy val is in range -127 -> 127
            if (val >= 0) {
              rgbData[colIdx][pixIdx] = 255;
              rgbData[colIdx][pixIdx + 1] = 255 - 2 * val;
              rgbData[colIdx][pixIdx + 2] = 255 - 2 * val;
            }
            else{
              rgbData[colIdx][pixIdx + 2] = 255;
              rgbData[colIdx][pixIdx] = 255 - 2 * Math.abs(val);
              rgbData[colIdx][pixIdx + 1] = 255 - 2 * Math.abs(val);
            }
          }
          rgbData[colIdx][pixIdx + 3] = 255;

        }
      }
      
    }

    function displayImage(data, diameter, id) {
      const imageTensor = tf.tensor3d(data, [diameter, diameter, 4], 'int32');
      const resizeImage = tf.image.resizeNearestNeighbor(imageTensor, [256, 256]);
      const resizeData = resizeImage.dataSync();
      // Create a 2D canvas to store the result
      var canvas = document.getElementById(id);
      canvas.width = 256;
      canvas.height = 256;
      var context = canvas.getContext('2d');

      // Copy the pixels to a 2D canvas
      var imageData = context.createImageData(256, 256);
      imageData.data.set(resizeData);
      context.putImageData(imageData, 0, 0);

      var img = new Image();
      img.src = canvas.toDataURL();
      return img;
    }

    /**
     * Handle the mousemove event to explore the points in the
     * plot canvas.
     * @param plotCanv
     * @param e
     */
    function plotExplore(plotCtx, e) {
      const x  = e.clientX - plotCtx.canvas.offsetLeft;
      const y  = e.clientY - plotCtx.canvas.offsetTop;
      const digitIndex = this.plotDigitIndex[y * plotCanv.width + x];
      if (digitIndex >= 1) {
        
        const labelEl = document.getElementById('sampId');
        labelEl.innerText = labelSet[digitIndex];
      }
    }

    function restart() {
      cancel = true;
      setTimeout(async ()=> {
        initKonva();
        await system.scatterplot.getData();
  }, 1000)

}

    return this;
}).call({})