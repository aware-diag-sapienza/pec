/* eslint-disable */
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
    let message = null
    try {
      this.__recievedCounter++
      message = JSON.parse(event.data)
    } catch (e) {
      console.warn(event.data)
      console.warn(e)
    }
    if (message === null) return
    else if (message.type === 'M') this.__onMessageCallback(message.body)
    else if (message.type === 'R') console.log('Request recieved... not yet implemented.')
    else if (message.type === 'RR') this.__resolveRequest(message)
    else console.warn(`Undefined message type recieved: ${message.type}`)
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
      if (message.type !== undefined && message.type === 'elbow-partial-result') {
        const pr = new ElbowPartialResult(message.data)
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
    const job = new AsyncJob(jobId, req, this, "PEC")
    this.jobs.set(jobId, job)
    return job
  }

  async createElbowJob (dataset, type, kMin, kMax, r, s, earlyTermination=null) {
    if( earlyTermination !== null && earlyTermination !== "slow" && earlyTermination !== "fast"){
      console.error(`EarlyTermination must be in {null, 'slow', 'fast'} not ${earlyTermination}`)
      return 
    }
    
    const req = {
      dataset: dataset,
      type: type,
      kMin: kMin,
      kMax: kMax,
      r: r,
      s: s,
      et: earlyTermination
    }
    const jobId = await this.ws.sendRequest(`createElbowJob:${JSON.stringify(req)}`)
    const job = new AsyncJob(jobId, req, this, "Elbow")
    this.jobs.set(jobId, job)
    return job
  }

  __startJob (id) {
    this.ws.sendMessage(`startJob:${id}`)
  }

  __pauseJob (id) {
    this.ws.sendMessage(`pauseJob:${id}`)
  }

  __resumeJob (id) {
    console.log("send resume")
    this.ws.sendMessage(`resumeJob:${id}`)
  }

  __stopJob (id) {
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
 * AsyncJob
 *
 */
class AsyncJob {
  constructor (id, req, ws, type) {
    this.id = id
    this.type = type
    this.__req = req
    this.__ws = ws
    this.__onPartialResultCallback = (res) => {}
    
    this.status = null // running, paused, stopped, completed
    this.results = []
  }

  __addPartialResult (pr) {
    this.results.push(pr)
    this.__onPartialResultCallback(pr)
    
    
  }

  start () {
    if (this.status === null){ // start the job
      this.status = 'running'
      this.__ws.__startJob(this.id)
    } else { // the job has been started, check if is in pause or stopped
      if(this.status == 'running') console.warn('The job is already running')
      else if (this.status == 'stopped') console.warn('The job has been stopped')
      else if (this.status == 'completed') console.warn('The job is completed')
      else if (this.status == 'paused') this.__ws.__resumeJob(this.id)
    }
    return this
  }

  pause(){
    if (this.status === 'running'){ //pause the job
      this.status = 'paused'
      this.__ws.__pauseJob(this.id)
    } else {  // the job is not running
      if (this.status == 'stopped') console.warn('The job has been stopped')
      else if (this.status == 'completed') console.warn('The job is completed')
      else if (this.status == 'paused') console.warn('The job is already paused')
    }
    return this 
  }

  resume () {
    if (this.status === 'paused'){ // start the job
      this.status = 'running'
      this.__ws.__resumeJob(this.id)
    } else { // the job has been started, check if is in pause or stopped
      if(this.status == 'running') console.warn('The job is already running')
      else if (this.status == 'stopped') console.warn('The job has been stopped')
      else if (this.status == 'completed') console.warn('The job is completed')
    }
    return this
  }

  stop () { /// ANCORA  NON FUNZIONA
    if (this.status === 'running' || this.status === 'paused'){ // stop the job
      this.status = 'stopped'
      this.__ws.__stopJob(this.id)
    } else { // the job is not running or paused
      if (this.status == 'stopped') console.warn('The job has been already stopped')
      else if (this.status == 'completed') console.warn('The job is completed')
    }
    return this
  }

  
  onPartialResult (callback) {
    this.__onPartialResultCallback = callback
    return this
  }
}
/**
 *
 * PECPartialResult
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
    this.info.runs_iterations = this.info.runs_iterations.split('-').map(d => parseInt(d))
  }
}

/**
 *
 * PECPartialResult
 *
 */
 class ElbowPartialResult {
  constructor (data) {
    this.jobId = data.jobId
    this.k = data.k
    this.inertia = data.inertia
    this.labels = data.labels
    this.isLast = data.isLast
  }
}



