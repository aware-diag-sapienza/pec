 const csvUrl ='https://storage.googleapis.com/tfjs-examples/multivariate-linear-regression/data/boston-housing-train.csv';

async function run() {

  const csvDataset = tf.data.csv(
    csvUrl, {
      columnConfigs: {
        medv: {
          isLabel: true
        }
      }
    });

    console.log(csvDataset)
  const numOfFeatures = (await csvDataset.columnNames()).length - 1;

  // Prepare the Dataset for training.
  const flattenedDataset =
    csvDataset
    .map(({xs, ys}) =>
      {
        // Convert xs(features) and ys(labels) from object form (keyed by
        // column name) to array form.
        console.log(xs,ys)
        return {xs:Object.values(xs), ys:Object.values(ys)};
      })
    //.batch(10);

const it = await flattenedDataset.iterator()
   const xs = []
   const ys = []
   // read only the data for the first 5 rows
   // all the data need not to be read once 
   // since it will consume a lot of memory
   for (let i = 0; i < 5; i++) {
        let e = await it.next()
      xs.push(e.value.xs)
      ys.push(e.value.ys)
   }
  const features = tf.tensor(xs)
  const labels = tf.tensor(ys)

  console.log(features.shape)
  console.log(labels.shape)

}

run();