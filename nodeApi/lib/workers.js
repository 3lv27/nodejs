

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
workers.performCheck .. //@todo

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
