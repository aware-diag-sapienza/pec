if (window.system == undefined) window.system = {}
system.scatterplotFixed = (function() {
    const that = this;

  this.plotDigitIndex = null;
  this.width = null;
  this.height = null;
  this.coordData = null;
  this.tot_rows;
  this.scale_label = d3.scaleOrdinal(d3.schemeCategory10);

  this.scale_color = ['#3366cc', '#dc3912','#ff9900','#109618','#d6616b','#990099','#0099c6','#dd4477','#66aa00','#b82e2e','#17becf','#bcbd22','#9467bd','#8c564b','#e377c2','#759EF1','#FFD40B','#52DA2E','#0ED1E3','#0C292B','#697374']

  let stage;
  let layer;
  this.margin = {top: 5, right: 10, bottom: 5, left: 10}
  let nodes = [];
  let tooltipLayer;

  let tooltip;

  this.scale_x = null
  this.scale_y = null
  this.readCsv = null
  this.coordinates = null;

  function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  this.reset = () => {
    nodes = []
    this.scale_x = null
    this.scale_y = null
    this.readCsv = null
    this.coordinates = null
    this.early_termination = null;

    d3.select('#information-info').html("")
    d3.selectAll('.scatter')
      .style('border-style', 'solid')
      .style('border-width', '0px')
      .style('border','grey')

  }

  this.initKonva =() => {
    this.width = document.getElementById('id-scatterplot-2').getBoundingClientRect().width
    this.height  = document.getElementById('id-scatterplot-2').getBoundingClientRect().height
    this.plotDigitIndex = new Int32Array(this.width*this.height);
    this.plotDigitIndex.fill(-1);

    stage = new Konva.Stage({
      container: 'id-scatterplot-2',
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
  //
  /*
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
  });*/
}

this.updateScatterplot = (useScale,useColor, scaleX,scaleY,labels,stability)=> {
  
  plotCoordsKonva(that.tot_rows,'colori',useScale,useColor,scaleX,scaleY,labels,stability)
}


function scaleClusterStability(usescale,metrica,cluster,stability){
  if(!usescale){
    return '#F0F0F0';
  }
  

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
   if(!$("#stable-check").is(':checked') && stability > 0.80){
    return 0
  } 
  if(!$("#midstable-check").is(':checked') && (stability > 0.20 && stability <= 0.80 )){
    return  0
  }

  if(!$("#unstable-check").is(':checked') && stability <= 0.20){
    return 0
  }
  return 3.5 
}

function plotCoordsKonva(numberPoints, col, useScale,useColor,scaleX,scaleY,labels,stability) {
  let PLOT_SCATTERPLOT = $('input[name="plot-scatterplot"]:checked').val();

  if (useScale){
  that.scale_x = d3.scaleLinear()
  .domain(system.scatterplot.scale_x.domain())
  .range([10,stage.width()-10]);

  that.scale_y =  d3.scaleLinear()
  .domain(system.scatterplot.scale_y.domain())
  .range([10, stage.height()-10]);
  
  }  
  // first time create the points
  const kWidth = stage.width();
  const kHeight = stage.height();
  let  colorlabel, opacitypoint;

  if (nodes.length === 0) {
    setupTooltip();
    for (let i = 0; i < numberPoints; i++) {

      const xcoord = Math.round((that.scale_x(that.coordData[i][0]))) //* (kWidth - 1));
      const ycoord = Math.round((that.scale_y(that.coordData[i][1]))) //* (kHeight - 1));
      
      colorlabel = scaleClusterStability(useColor,PLOT_SCATTERPLOT,labels[i],stability[i])
      opacitypoint =  scaleOpacityStability(PLOT_SCATTERPLOT,labels[i],stability[i])
      
      let node = new Konva.Circle({
        x: xcoord,
        y: ycoord,
        radius: opacitypoint,
        fill: colorlabel,// + colStr,
        id: 'i:' + i + '\nc: '+ labels[i] + '\nx: '+that.coordData[i][0] +
          '\ny:' + that.coordData[i][1]
      });
      layer.add(node);
      nodes.push(node);
    }
  }
  else {
    //const labels = Array.from({length: numberPoints}, () => Math.floor((Math.random()*numberPoints)%10));
    for (let i = 0; i < numberPoints; i++) {
      let cc = scaleClusterStability(useColor,PLOT_SCATTERPLOT,labels[i],stability[i])

      let sc = scaleOpacityStability(PLOT_SCATTERPLOT,labels[i],stability[i])

      nodes[i].attrs.fill = scaleClusterStability(useColor,PLOT_SCATTERPLOT,labels[i],stability[i])
      nodes[i].attrs.radius = scaleOpacityStability(PLOT_SCATTERPLOT,labels[i],stability[i])
      nodes[i].id =  'i:' + i + '\nc: '+ labels[i] + ' ' + colorlabel 
    }
  }
  layer.batchDraw();
  
}


return this;
}).call({})