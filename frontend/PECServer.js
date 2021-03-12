class JsonWebSocket {
  constructor (url, verbose, promiseResolve) {
    this.url = url
    this.verbose = verbose
    this.socket = new WebSocket(url)
    this.connected = false
    this.promiseResolve = promiseResolve

    this.__onMessageCallback = (data) => {}
    this.__sentCounter = 0
    this.__recievedCounter = 0
    this.__pendingRequests = new Map()
    this.__addListeners()
  }

  __addListeners () {
    // Connection opened
    this.socket.addEventListener('open', (event) => {
      this.connected = true
      if (this.verbose) console.log('Connection opened.', event)
      this.promiseResolve()

    })
    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      if (this.verbose) console.log('RawMessage from server.', event.data)
      this.__decodeIncomingMessage(event)
    })
    // Error
    this.socket.addEventListener('error', (event) => {
      console.warn('Error.', event)
    })
    // Connection closed
    this.socket.addEventListener('error', (event) => {
      this.connected = false
      if (this.verbose) console.log('Connection closed.', event)
    })
  }

  __encodeOutgoingMessage (type, data) {
    const messageId = this.__sentCounter++
    const message = {
      type: type,
      timestamp: Date.now() / 1000,
      id: messageId,
      body: data
    }
    const messageString = JSON.stringify(message)
    if (this.verbose) console.log('Sending RawMessage.', messageString)
    return { messageId, messageString }
  }

  __decodeIncomingMessage (event) {
    try {
      this.__recievedCounter++
      const message = JSON.parse(event.data)
      if (message.type === 'M') this.__onMessageCallback(message.body)
      else if (message.type === 'R') console.log('Request recieved... not yet implemented.')
      else if (message.type === 'RR') this.__resolveRequest(message)
      else console.warn(`Undefined message type recieved: ${message.type}`)
    } catch (e) {
      console.warn(e) //, event.data)
    }
  }

  __resolveRequest (message) {
    const promiseExecutor = this.__pendingRequests.get(message.requestId)
    if (promiseExecutor === undefined) {
      console.warn(`Undefined pending request id: ${message.requestId}`)
    }
    promiseExecutor.resolve(message.body)
    this.__pendingRequests.delete(message.requestId)
  }

  onMessage (callback) {
    this.__onMessageCallback = callback
  }

  sendMessage (data) {
    const { messageString } = this.__encodeOutgoingMessage('M', data)
    this.socket.send(messageString)
  }

  async sendRequest (data) {
    const promiseExecutor = {
      resolve: null,
      reject: null
    }
    const p = new Promise((resolve, reject) => {
      promiseExecutor.resolve = resolve
      promiseExecutor.reject = reject
    })

    const { messageId, messageString } = this.__encodeOutgoingMessage('R', data)
    this.socket.send(messageString)
    this.__pendingRequests.set(messageId, promiseExecutor)
    return await p
  }
}
/**
 *
 * __PECServer
 * Classe che gestisce la connessione con il server.
 *
 */
class __PECServer {
  constructor (ws) {
    this.ws = ws
    this.jobs = new Map()

    this.ws.onMessage((message) => {
      if (message.type !== undefined && message.type === 'partial-result') {
        const pr = new PECPartialResult(message.data)
        this.jobs.get(pr.jobId).__addPartialResult(pr)
      }
    })
  }

  async getDatasetsInfo () {
    const list = await this.ws.sendRequest('datasetsInfo')
    return list
  }

  async getDataset (name) {
    const d = await this.ws.sendRequest(`dataset:${name}`)
    return d
  }

  async createAsyncJob (dataset, type, k, r, s) {
    const req = {
      dataset: dataset,
      type: type,
      k: k,
      r: r,
      s: s
    }
    const jobId = await this.ws.sendRequest(`createAsyncJob:${JSON.stringify(req)}`)
    const job = new AsyncPECJob(jobId, req, this)
    this.jobs.set(jobId, job)
    return job
  }

  startJob (id) {
    this.ws.sendMessage(`startJob:${id}`)
  }

  stopJob (id) {
    this.ws.sendMessage(`stopJob:${id}`)
  }
}

async function PECServer(url, verbose = false){
  const promiseExecutor = {
    resolve: null,
    reject: null
  }
  const p = new Promise((resolve, reject) => {
    promiseExecutor.resolve = resolve
    promiseExecutor.reject = reject
  })
  const ws = new JsonWebSocket(url, verbose, promiseExecutor.resolve)
  await p
  return new __PECServer(ws)
}
/**
 *
 * AsyncPECJob
 *
 */
class AsyncPECJob {
  constructor (id, req, ws) {
    this.id = id
    this.__req = req
    this.__ws = ws
    this.__onPartialResultCallback = (res) => {}
    //
    this.started = false
    this.stopped = false
    this.results = []
  }

  __addPartialResult (pr) {
    this.results.push(pr)
    this.__onPartialResultCallback(pr)
  }

  start () {
    if (this.started) console.error('The job has been yet started')
    else {
      this.started = true
      this.__ws.startJob(this.id)
    }
  }

  stop () { /// ANCORA  NON FUNZIONA
    if (!this.started) console.error('The job has NOT been started')
    if (this.stopped) console.error('The job has been yet stopped')
    else {
      this.stopped = true
      this.__ws.stopJob(this.id)
    }
  }

  onPartialResult (callback) {
    this.__onPartialResultCallback = callback
    return this
  }
}
/**
 *
 * PartialResult
 *
 */
class PECPartialResult {
  constructor (data) {
    this.jobId = data.job_id
    this.iteration = data.info.iteration
    this.timestamp = data.info.timestamp
    this.isLast = data.info.is_last
    this.info = data.info
    this.labels = data.labels
    this.partitions = data.partitions
    this.metrics = data.metrics

    // convert string to array or matrix
    this.info.completed_runs_status = this.info.completed_runs_status.split('-').map(d => d === 't')
    
    //this.info.decision_ami = this.info.decision_ami.split('::').map(d => parseFloat(d))
    //this.info.decision_ars = this.info.decision_ars.split('::').map(d => parseFloat(d))
    //this.info.runs_inertia = this.info.runs_inertia.split('::').map(d => parseFloat(d))
    this.info.runs_iterations = this.info.runs_iterations.split('-').map(d => parseInt(d))
    //this.info.runs_ami_matrix = this.info.runs_ami_matrix.split('||').map(row => row.split('::').map(d => parseFloat(d)))
    //this.info.runs_ars_matrix = this.info.runs_ars_matrix.split('||').map(row => row.split('::').map(d => parseFloat(d)))
  }
}
