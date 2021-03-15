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

  this.tensorResultComputation= {};
  this.datasetComputed = [];

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

    d3.select('#information-info').html("")
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
this.updateScatterplot = (fixed,labels)=> {

  plotCoordsKonva(that.tot_rows,'#b3b3b3',false,labels)
  
}
this.updateScatterplotEarlyTermination= (labels,final_ars)=> {

  if ( this.early_termination == null){
  d3.select('#information-info').html("Early Termination Fast - " + $('#iteration-label').text() + '   <b>ARI<b/>: ' + final_ars.toFixed(4))
  system.scatterplotFixed.updateScatterplot(false,true, that.scale_x,that.scale_y,labels);//useScale,useColor, scaleX,ScaleY

  this.early_termination = true;

  }

}

function plotCoordsKonva(numberPoints, col, useScale,labels) {

  //const labels = Array.from({length: numberPoints}, () => Math.floor((Math.random()*numberPoints)%10));

  console.log('nodes', nodes, 'start_computation',that.start_computation)
  console.log('numberPoints',numberPoints, 'col',col, 'useScale',useScale,'labels',labels)
  // first time create the points
  const kWidth = stage.width();
  const kHeight = stage.height();
  
  if (nodes.length === 0) {
    setupTooltip();
    for (let i = 0; i < that.tot_rows; i++) {
      //console.log(i,coordData[i])
      if (useScale){ // se ho la scala di visualizzazione
        const xcoord = Math.round((that.scale_x(that.coordData[i*2]))) // * (kWidth -10));
        const ycoord = Math.round((that.scale_y(that.coordData[i*2+1]))) //* (kHeight -10));
        let colorlabel
        if(that.first_iteration){
          colorlabel = col
        } else {
          colorlabel =that.scale_color[labels[i]];
        }
        let node = new Konva.Circle({
          x: xcoord,
          y: ycoord,
          radius: 3.5,
          fill: colorlabel,// + colStr,
          id: 'i:' + i + '\nc: '+ labels[i] + ' ' + colorlabel + '\nx: '+xcoord +
          '\ny:' + ycoord
        });
        layer.add(node);
        nodes.push(node);
      } else {
      const xcoord = Math.round((that.coordData[i*2]) * (kWidth - 10));
      const ycoord = Math.round((that.coordData[i*2 + 1]) * (kHeight - 10));
      let colorlabel
        if(that.first_iteration){
          colorlabel = col
        } else {
          colorlabel =that.scale_color[labels[i]];
        }
      let node = new Konva.Circle({
        x: xcoord,
        y: ycoord,
        radius: 3.5,
        fill: '#F0F0F0',// + colStr,
        id: 'prova'+i
      });
      layer.add(node);
      nodes.push(node);
      }

      
    }
    
  } else {
    
    for (let i = 0; i < numberPoints; i++) {
      const colorlabel = that.scale_color[labels[i]];
      nodes[i].attrs.fill = colorlabel
    }
  }
  
  
  layer.batchDraw();
  

  if (that.datasetComputed.indexOf(dataset) == -1){
    that.tensorResultComputation[dataset] = that.coordData
    that.datasetComputed.push(dataset)
  }

  d3.selectAll('.scatter')
  .style('border-style', 'solid')
  .style('border-width', '1px')
  
  if (that.start_computation == null){
    that.start_computation = true
    d3.select('#iteration-label').html('<button type="button" id="runButton" class="btn btn-outline-info" onclick="startIterations()" style="display: none;"><i class="fa fa-fast-forward"></i>RUN</button> <label class="control-label"> Click run</label>    ')
    document.getElementById('runButton').style.display = "inline-block"
  //readFile(1);
  //d3.select('#iteration-label').html("")
  //d3.select('#information-info').html("Early Termination")
  //readFile(1);
  //d3.select('#iteration-label').html("")
  //d3.select('#information-info').html("Early Termination")

  }
}

//const csvUrl = //'https://storage.googleapis.com/tfjs-examples/multivariate-linear-regression/data/boston-housing-train.csv';

//'./data/n5000-d2-k15-s2.csv';

 async function generateDataForScatterplot(dataset_projection,labelIteration){

  

  //csvUrl, sia il dataset con la proiezione
  //dataIterationURL, sia l'array con le label.
   
   /*const csvDataset = tf.data.csv(
     csvUrl, {
       columnConfigs: {
       }
     });*/
   
   const numOfFeatures = 2;

   /*const flattenedDataset =
     csvDataset
     .map((rawFeatures) => {
       
       return [Object.values(rawFeatures)]
      
      })*/
      
      that.tot_rows = dataset_projection//= await d3.json(csvUrl+'/entries').then((data)=> {return parseInt(data)}) // ALESSIAAAAA QUI VA IL LINK VECCHIO
      console.log('that_rows',that.tot_rows)
      system.scatterplotFixed.tot_rows = that.tot_rows//await d3.json(csvUrl+'/entries').then((data)=> {return parseInt(data)});
      let dataIteration= labelIteration//await d3.json(dataIterationURL).then((data)=> {return data})
      
      //const it = await flattenedDataset.iterator()
      //const num = await flattenedDataset.iterator()

      let xs = []

      let first_feature = []
      let second_feature = []
     
      console.log('that.datasetComputed',that.datasetComputed,that.first_iteration)
      
      that.coordData = that.tot_rows
      system.scatterplotFixed.coordData= that.tot_rows
      if(that.first_iteration){

        // capire se togliere questo IF
        if (numOfFeatures == 2){
          console.log('that.tot_rows',that.tot_rows)
        for (let i = 0; i<that.tot_rows; i++) {

          let e = await it.next()
          
          let array0 = e.value[0]
          console.log('arr_0',array0)
          first_feature.push(e.value[0][0])
          second_feature.push(e.value[0][1])
          xs = xs.concat(array0)
       }
        that.scale_x = d3.scaleLinear()
        .domain([d3.min(first_feature), d3.max(first_feature)])
        .range([10,stage.width()-10]);
        
        that.scale_y = d3.scaleLinear()
        .domain([d3.min(second_feature), d3.max(second_feature)])
        .range([10, stage.height()-10]);
    
        
        plotCoordsKonva(that.tot_rows, '#b3b3b3',true,dataIteration.labels);
        system.scatterplotFixed.updateScatterplot(true,false, that.scale_x,that.scale_y,dataIteration.labels);//useScale,useColor, scaleX,ScaleY
        } else {
          plotCoordsKonva(that.tot_rows, '#b3b3b3',false,dataIteration.labels);
        system.scatterplotFixed.updateScatterplot(false,false, that.scale_x,that.scale_y,dataIteration.labels);//useScale,useColor, scaleX,ScaleY
      

        }
        that.first_iteration = false
      } else {
      
      plotCoordsKonva(that.tot_rows, '#b3b3b3',false,dataIteration.labels); // qui bisogna mettere il ciclo per il numero di features
    

     

   if (numOfFeatures == 2){ // I can map the dataset directly on the scatter

    for (let i = 0; i<that.tot_rows; i++) {
      let e = await it.next()

      let array0 = e.value[0]
      first_feature.push(e.value[0][0])
      second_feature.push(e.value[0][1])
      xs = xs.concat(array0)
   }

   //

    
    that.coordData = await new Float32Array(xs);
    system.scatterplotFixed.coordData = await new Float32Array(xs);
    

    
    that.scale_x = d3.scaleLinear()
    .domain([d3.min(first_feature), d3.max(first_feature)])
    .range([10,stage.width()-10]);
    
    that.scale_y = d3.scaleLinear()
    .domain([d3.min(second_feature), d3.max(second_feature)])
    .range([10, stage.height()-10]);

    
    plotCoordsKonva(that.tot_rows, '#b3b3b3',true,dataIteration.labels);
    system.scatterplotFixed.updateScatterplot(true,false, that.scale_x,that.scale_y,dataIteration.labels);//useScale,useColor, scaleX,ScaleY
   } 
   else { // I need to permorm t-SNE
    d3.select('#iteration-label').html('Running t-SNE<img src="./img/loading.gif" width= "20px"/>')

    for (let i = 0; i<that.tot_rows; i++) {
      let e = await it.next()
      let array0 = (e.value[0])
      xs.push(array0)
    }

   
  const features = await tf.tensor(xs)
  features.print();
    const tsneOpt = tsne.tsne(features);
    tsneOpt.compute().then((d) => {

      this.coordinates = tsneOpt.coordinates();
      let attendRes = tsneOpt.coordinates().data()
      attendRes.then((res)=>{
        that.coordData = res
        system.scatterplotFixed.coordData = res;
        plotCoordsKonva(that.tot_rows, '#b3b3b3',false,dataIteration.labels);
        system.scatterplotFixed.updateScatterplot(false,false, that.scale_x,that.scale_y,dataIteration.labels);//useScale,useColor, scaleX,ScaleY
      })       
      this.coordinates.print();
    })
    }
  } 
  this.first_iteration = false;
}

 //}

    this.createData = (csvUrl, labelCluster) => {
      system.scatterplot.reset();
      system.scatterplotFixed.reset();
      system.scatterplot.initKonva();
      system.scatterplotFixed.initKonva();

      
      let provaTensor =  generateDataForScatterplot(csvUrl,labelCluster);

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
      /*let imgIds = ['canvasR', 'canvasG','canvasB'];
      for (let i = 0; i<3; i++) {
        displayImage(rgbData[i], diameter, imgIds[i]);
      }*/
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
        console.log(`digit idx: ${digitIndex}, label: ${labelSet[digitIndex]}`);
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

    this.createDataIteratively = () => {
      const data = tf.randomUniform([2000,10]);
const tsneOPT = tsne.tsne(data);
 

async function iterativeTsne() {
  // Get the suggested number of iterations to perform.
  const knnIterations = tsneOPT.knnIterations();
  // Do the KNN computation. This needs to complete before we run tsneOPT
  for(let i = 0; i < knnIterations; ++i){
    await tsneOPT.iterateKnn();
    // You can update knn progress in your ui here.
  }

  const tsneIterations = 10;
  for(let i = 0; i < tsneIterations; ++i){
    await tsneOPT.iterate();
    // Draw the embedding here...
    const coordinates = tsneOPT.coordinates();
    coordinates.print();
  }
}

iterativeTsne();
    }

    this.render= () =>{
      function gaussianRand() {
        var rand = 0;
        for (var i = 0; i < 6; i += 1) {
          rand += Math.random();
        }
        return (rand / 6)-0.5;
      }
      
      var X = [],
          Y = [],
          n = 1000000,
          i;
      
      for (i = 0; i < n; i += 1) {
        X.push(gaussianRand());
        Y.push(gaussianRand());
      }
      

      var data = [{
        type: "scattergl",
          mode: "markers",
          marker: {
          color : 'rgb(152, 0, 0)',
          line: {
            width: 1,
            color: 'rgb(0,0,0)'}
        },
          x: X,
          y: Y
      }]
      
      Plotly.newPlot('id-scatterplot-1', data)
    }
    return this;
}).call({})