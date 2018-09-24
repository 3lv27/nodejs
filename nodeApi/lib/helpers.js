/*
 * Helpers for various tasks
 *
 */

 // Dependencies
const crypto = require('crypto')
const config = require('./config')

// Container for all the helpers
let helpers = {}

// Create a SHA256 hash
helpers.hash = str => {
  if (typeof(str) == 'string' && str.length > 6) {
    const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
    return hash
  } else {
    return false
  }
}

// Parse a JSON string to na object in all cases without throwing
helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str)
    return obj
  } catch (error) {
    return {}
  }
}
 



module.exports = helpers