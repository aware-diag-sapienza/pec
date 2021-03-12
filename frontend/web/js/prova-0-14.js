const csvUrl =
'https://storage.googleapis.com/tfjs-examples/multivariate-linear-regression/data/boston-housing-train.csv';

async function run() {
   // We want to predict the column "medv", which represents a median value of
   // a home (in $1000s), so we mark it as a label.
   const csvDataset = tf.data.csv(
     csvUrl, {
       columnConfigs: {
         medv: {
           isLabel: true
         }
       }
     });

   // Number of features is the number of column names minus one for the label
   // column.
   const numOfFeatures = (await csvDataset.columnNames()).length - 1;
   console.log(csvDataset)

   // Prepare the Dataset for training.
   const flattenedDataset =
     csvDataset
     .map(([rawFeatures, rawLabel]) =>
       // Convert rows from object form (keyed by column name) to array form.
       [Object.values(rawFeatures), Object.values(rawLabel)])
     //.batch(10);

console.log(flattenedDataset)
     const it = await flattenedDataset.iterator()
     const num = await flattenedDataset.iterator()
     console.log('num',num)
     const xs = []
     const ys = []
     // read only the data for the first 5 rows
     // all the data need not to be read once 
     // since it will consume a lot of memory
     for (let i = 0; i < (267-1); i++) {
          let e = await it.next()
          console.log(e.value[0])
        let array0 = (e.value[0])
        xs.push(array0)
        ys.push(e.value.ys)
     }

     console.log('xss',xs)
    const features = tf.tensor(xs)
    const labels = tf.tensor(ys)
  
    console.log(features.shape)
    console.log(labels.shape)
    features.print();

    // Create a rank-2 tensor (matrix) matrix tensor from a multidimensional array.

    let array0 = [[1, 2], [3, 4]]
const a = tf.tensor(array0);
console.log('shape:', a.shape);
a.print();

   // Define the model.
  /* const model = tf.sequential();
   model.add(tf.layers.dense({
     inputShape: [numOfFeatures],
     units: 1
   }));
   model.compile({
     optimizer: tf.train.sgd(0.000001),
     loss: 'meanSquaredError'
   });

   // Fit the model using the prepared Dataset
   return model.fitDataset(flattenedDataset, {
     epochs: 10,
     callbacks: {
       onEpochEnd: async (epoch, logs) => {
         console.log(epoch + ':' + logs.loss);
       }
     }
   });*/
}

run();

function range(start,stop) {
  var result=[];
  for (var idx=start.charCodeAt(0),end=stop.charCodeAt(0); idx <=end; ++idx){
    result.push(String.fromCharCode(idx));
  }
  return result;
};

labels = Array.from({length: 5000}, () => Math.floor((Math.random()*5000)%20));
console.log(labels);