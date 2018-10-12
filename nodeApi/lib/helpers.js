/*
 * Helpers for various tasks
 *
 */

 // Dependencies
const crypto = require('crypto')
const config = require('./config')
const https = require('https')
const querystring = require('querystring')

// Container for all the helpers
let helpers = {}

// Create a SHA256 hash
helpers.hash = str => {
  if (typeof(str) == 'string' && str.length >= 6) {
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

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = strLength => {
  strLength = typeof(strLength) === 'number' && strLength > 0 ? strLength : false
  
  if (strLength) {
    // Define all the possible characters that could go into a string
    const possibleCharaters = 'abcdefghijklmnopqrstuvwxyz0123456789'

    // Start the final string
    let str = ''
    for (let i = 0; i < strLength; i++) {
      // Get a random character from the possibleCharacters string
      const randomCharacter = possibleCharaters.charAt(Math.floor(Math.random() * possibleCharaters.length))

      // Apend this charcater to the final string
      str += randomCharacter
    }
    return str 
  } else {
    return false
  }
} 

// Send a SMS message with Twilio
helpers.sendTwilioSms = (phone, message, callback) => {
  // Validate parameters
  phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false
  message = typeof (message) === 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false
  if (phone && message) {
    // Configure the request payload
    const payload = {
      From : config.twilio.fromPhone,
      To: '+34'+phone,
      Body: message
    }

    // STringfy the payload
    const stringPayload = querystring.stringify(payload)

    // Configure the request details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '2010-04-01/Accounts/'+config.twilio.accountSid+'/messages.json',
      auth: config.twilio.accountSid+':'+config.twilio.authtoken,
      headers: {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    }

    // Instantiate the request object
    const req = https.request(requestDetails, res => {
      // Grab the status of the sent request
      const status = res.statusCode
      // Callback successfuly if the request went through
      if (status === 200 || status === 201) {
        callback(false)      
      } else {
        callback('Status code returned was '+status)
      }
    })
    // Bind to the error event so it doesn't get thrown
    req.on('error', e => callback(e))

    // Add the payload
    req.write(stringPayload)

    // End the request
    req.end()


  } else {
    callback('Given parameters were missing or invalid')
  }


}
 


module.exports = helpers