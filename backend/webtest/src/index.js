import $ from 'jquery'
import 'normalize.css'
import 'pretty-checkbox/src/pretty-checkbox.scss'
import './index.scss'
import 'bootstrap'
import '@fortawesome/fontawesome-free/js/all'

import PECWebSocketClient from './PECWebSocketClient'
import * as d3 from 'd3'

const client = new PECWebSocketClient('ws://localhost:6789')

/* LISTA DEI DATASET */
d3.select('#b-datasetsInfo').on('click', async () => {
  const d = await client.getDatasetsInfo()
  d3.select('#p-datasetsInfo').text(JSON.stringify(d).substring(0, 200))
  console.log(d)
})

/* DATASET con matrice dati e proiezioni */
d3.select('#b-dataset').on('click', async () => {
  const d = await client.getDataset('glass')
  d3.select('#p-dataset').text(JSON.stringify(d).substring(0, 200))
  console.log(d)
})

/* AsyncClusteringJob */
d3.select('#b-ajob').on('click', async () => {
  const job = await client.createAsyncJob('glass', 'I-PecK', 5, 16, 0)

  console.log(job)
  d3.select('#p-ajob').text(job.id)

  job.onPartialResult((result) => {
    console.log(result)
  })

  d3.select('#b-astart').on('click', () => {
    job.start()
  })
})
