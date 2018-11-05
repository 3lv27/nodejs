

// Depencies
const path = require('path')
const fs = require('fs')
const _data = require('./data')
const http = require('http')
const https = require('https')
const helpers = require('./helpers')
const url = require('url')

// Instantiate the workers object
let workers = {}

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach(check => {
        // Read in the check data
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that function continue or log error as needed
            workers.validateCheckData(originalCheckData) 
          } else {
            console.log('Error: reading one of the check\'s data')
          }
        })
      });
    } else {
      console.log('Error: Could not find any checks to process')
    }
  })
}

// Sanity-check the check-data
workers.validateCheckData = checkData => {
  checkData = typeof(checkData) === 'object' && checkData !== null ? checkData : {}
  checkData.id = typeof (checkData.id) === 'string' && checkData.id.trim().length == 20 ? checkData.id.trim() : false
  checkData.userPhone = typeof (checkData.userPhone) === 'string' && checkData.userPhone.trim().length == 10 ? checkData.userPhone.trim() : false
  checkData.protocol = typeof (checkData.protocol) === 'string' && ['http', 'https'].indexOf(checkData.protocol) > -1 ? checkData.protocol : false
  checkData.url = typeof (checkData.url) === 'string' && checkData.url.trim().length > 0 ? checkData.url.trim() : false
  checkData.method = typeof (checkData.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(checkData.method) > -1 ? checkData.method : false
  checkData.successCodes = typeof (checkData.successCodes) === 'object' && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : false
  checkData.timeoutSeconds = typeof (checkData.timeoutSeconds) === 'number' && checkData.timeoutSeconds % 1 === 0 && checkData.timeoutSeconds >= 1 && checkData.timeoutSeconds <= 5 ? checkData.timeoutSeconds : false

  // Set the keys that may not be set (if the workers have never seen this check before)
  checkData.state = typeof (checkData.state) === 'string' && ['up', 'down'].indexOf(checkData.state) > -1 ? checkData.state : 'down'
  checkData.lastChecked = typeof (checkData.lastChecked) === 'number' && checkData.lastChecked > 0 ? checkData.lastChecked : false

  // If all the checks pass, pass the data along to the next step in the process
  if (checkData.id &&
    checkData.userPhone &&
    checkData.protocol && 
    checkData.url && 
    checkData.method &&
    checkData.successCodes &&
    checkData.timeoutSecond) {
      workers.performCheck(checkData)
  } else {
    console.log('Error: One of the checks is not properly formatted. Skipping it')
  }
}

// Perform the check, send the checkData and the outcome of the check process to the next step in the process
workers.performCheck = checkData => {
  // Prepare the initial check outcome
  let checkOutcome = {
    error: false,
    responseCode: false
  }

  // Mark that the outcome has not been sent yet
  let outcomeSent = false

  // Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(checkData.protocol+'://'+checkData.url, true)
  const hostName = parsedUrl.hostname
  const path = parsedUrl.path // Using path and not "pathname" because we want the query string


  // Constructing the request
  const requestDetails = {
    protocol: checkData.protocol+':',
    hostname: hostName,
    method: checkData.method.toUpperCase(),
    path: path,
    timeout: checkData.timeoutSeconds * 1000
  }

  // Instantiate the request object using either the http or the https module
  const _moduleToUse = checkData.protocol === 'http' ? http : https
  const req = _moduleToUse.request(requestDetails, res => {
    // Grab the status of the sent request
    const status = res.statusCode

    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome)
      outcomeSent = true
    }
  })

  // Bind to the error event so it doesnt get thrown
  req.on('error', e => {
    checkOutcome.error = {
      error: true,
      value: e
    }
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome)
      outcomeSent = true
    }
  })

  // Bind on the timeout event
  req.on('timeout', e => {
    checkOutcome.error = {
      error: true,
      value: 'timeout'
    }
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome)
      outcomeSent = true
    }
  })

  // End the request 
  req.end()
}

// Process the checkOutcome process the check data as needed, trigger an alert if needed
//Special logic for acomodating a check that has never been tested before (don't throw an alert on this one)
workers.processCheckOutcome = (checkData, checkOutcome) => {
  // Decide if the check is considered up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && checkData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'

  // Decide if an alert is warranted
  const alertWarranted = checkData.lastChecked && checkData.state !== state ? true : false

  // Update the checkData
  //@todo
}

// Timer to execute the worker process once per minut
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks()
  }, 1000 * 60)
}

// Init script
workers.init = () => {
  // Execute all the checks inmediately
  workers.gatherAllChecks()
  // Call the loop so the checks will execute later on
  workers.loop()
}


// Export the module
module.exports = workers
