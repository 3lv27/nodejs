/*
 * Request handlers
 *
 */

// Dependencies
const _data = require('./data')
const helpers = require('./helpers')
const config = require('./config')

// Define the handlers
let handlers = {}

// User handler
handlers.users = (data, callback) => {
  const acceptableMethods = ['get', 'post', 'put', 'delete']
  if (acceptableMethods.lastIndexOf(data.method) > -1) {
    handlers._users[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Container for the users submethods
 handlers._users = {}

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  // Check that all required fields are filled out
  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length >= 6 ? data.payload.password.trim() : false
  const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? data.payload.tosAgreement : false

  if (firstName && lastName && phone && password && tosAgreement ) {
    //Make sure that the user doesn't already exists
    _data.read('users', phone, (err,data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password)

        // Create the user object
        if (hashedPassword) {
          const userObject = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            hashedPassword: hashedPassword,
            tosAgreement: true
          }

          // Store the user
          _data.create('users', phone, userObject, err => {
            if (!err) {
              callback(200)
            } else {
              console.log(err)
              callback(500, { 'Error': 'could not create the new user' })
            }
          })
        } else {
          callback(500, {'Error': 'could not hash the user\'s password'})
        }
       
      } else {
        // User already exists
        callback(400, {'Error': 'A user with that phone number already exists'})
      }
    })
  } else {
    callback(400, {'Error': 'Missing required fields'})
  }
}
// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
  // Check that phone number provided is valid
  const phone = typeof(data.queryString.phone) === 'string' && data.queryString.phone.length === 10 ? data.queryString.phone : false
  if (phone) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false
    // Verify that the given token is valid for the phone number
    handlers.tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // Look up the user
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            // Remove the hashed password from the user object before retunrning it to the request
            delete data.hashedPassword

            callback(200, data)
          } else {
            callback(404, { 'Error': 'User not found' })
          }
        }) 
      } else {
        callback(403, {'Error': 'Missing required token in header, or invalid token'})
      }
    }) 
  } else {
    callback(400, {'Error': 'Missing required field'})
  }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
  // Check for the required field
  const phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone : false
  console.log(phone)
  // Check for the optional fields
  const firstName = typeof (data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
  const lastName = typeof (data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
  const password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length >= 6 ? data.payload.password.trim() : false

  // Error if the phone is valid
  if (phone) {
    // Error if nothig is sent to update
    if (firstName || lastName || password) {
      // Get the token from the headers
      const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
      // Verify that the given token is valid for the phone number
      handlers.tokens.verifyToken(token, phone, tokenIsValid => {
        if (tokenIsValid) {
          // Look up the user
          _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              if (firstName) {
                userData.firstName = firstName
              }
              if (lastName) {
                userData.lastName = lastName
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password)
              }

              // Store the new updates
              _data.update('users', phone, userData, err => {
                if (!err) {
                  callback(200)
                } else {
                  console.log(err)
                  callback(500, { 'Error': 'Could not update the user' })
                }
              })
            } else {
              callback(400, { 'Error': 'The sepcified user does not exist' })
            }
          })
        } else {
          callback(403, { 'Error': 'Missing required token in header, or invalid token' })
        }
      })      
    } else {
      callback(400, {'Error': 'Missing fields to update'})
    }
    
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}

// Users - delete
// Users - get
// Required data: phone
// Optional data: none
handlers._users.delete = (data, callback) => {
  // Check that phone number provided is valid
  const phone = typeof(data.queryString.phone) === 'string' && data.queryString.phone.length === 10 ? data.queryString.phone : false
  if (phone) {
    const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
    // Verify that the given token is valid for the phone number
    handlers.tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        //Lookup the user
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            _data.delete('users', phone, err => {
              if (!err) {
                // Delete each of the check associated to the user
                const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : []
                const checksToDelete = userChecks.length
                if (checksToDelete > 0) {
                  let checksDeleted = 0
                  let deletionsError = false
                  // loop through the check
                  userChecks.forEach(checkId => {
                    // Delete the check
                    _data.delete('checks', checkId, err => {
                      if (err) {
                        deletionsError = true
                      }
                      checksDeleted++
                      if (checksDeleted === checksToDelete) {
                        if (!deletionsError) {
                          callback(200)
                        } else {
                          callback(500, { 'Error': 'Errors encountered while attempting to delete all of the user\'s checks' })
                        }
                      }
                    })
                  })
                } else {
                  callback(200)
                }
              } else {
                callback(400, { 'Error': 'Could not find the specified user' })
              }
            })
          } else {
            callback(400, { 'Error': 'Could not delete the specified user' })
          }
        })
      } else {
        callback(403, { 'Error': 'Missing required token in header, or invalid token' })
      }
    })
  } else {
    callback(400, {'Error': 'Missing required field'})
  }
}

// Tokens handler
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['get', 'post', 'put', 'delete']
  if (acceptableMethods.lastIndexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Container for all the tokens methods
handlers._tokens = {}

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  const phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false
  const password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length >= 6 ? data.payload.password.trim() : false

  if (phone && password) {
    // Look up the user who matches the ofund number
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // Hash the sent password and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password)
        if (hashedPassword === userData.hashedPassword) {
          // If valid, create a new token with a random name. Set expiration date 1 hour in the future
          const tokenId = helpers.createRandomString(20)
          const expires = Date.now() + 3600
          const tokenObject = {
            phone,
            id: tokenId,
            expires
          }

          // Store the token
          _data.create('tokens', tokenId, tokenObject, err => {
            if (!err) {
              callback(200, tokenObject)
            } else {
              callback(500, {'Error': 'Could not create the new token'})
            }
          })
        } else {
          callback(400, {'Error': 'Password did not match the specified user\'s stored password'})
        }
      } else {
        callback(400, {'Error': 'Could not fund the specified user'})
      }
    })
  } else {
    callback(400, {'Error': 'Missing required fields'})
  }
}

// Tokens - get
// Required data: tokenId
// Optional data: none
handlers._tokens.get = (data, callback) => {
  //Ckeck that the id sent is valid
  const id = typeof (data.queryString.id) === 'string' && data.queryString.id.length === 20 ? data.queryString.id : false
  console.log(id)
  if (id) {
    // Look up the user
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        // Remove the hashed password from the user object before retunrning it to the request
        callback(200, tokenData)
      } else {
        callback(404, { 'Error': 'Token not found' })
      }
    })

  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  const id = typeof (data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false
  const extend = typeof (data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false
  console.log('extend', typeof (data.payload.extend))
  if (id && extend) {
    // Look up the token
    _data.read('tokens',id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration and hour from now
          tokenData.expires = Date.now() + 3600

          // Store the new updates
          _data.update('tokens', id, tokenData, err => {
            if (!err) {
              callback(200)
            } else {
              callback(500, {'Error': 'Could not update the token expiration'})
            }
          })
        } else {
          callback(400, {'Error': 'The token already expired and can not be extended'})
        }
      } else {
        callback(400, {'Error': 'Specified token does not exist'})
      }
    })
  } else {
    callback(400, {'Error': 'Missing required field(s) or field(s) are invalid'})
  }
}

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that id  provided is valid
  const id = typeof (data.queryString.id) === 'string' && data.queryString.id.length === 20 ? data.queryString.id : false
  if (id) {
    _data.delete('tokens', id, err => {
      if (!err) {
        callback(200)
      } else {
        callback(400, { 'Error': 'Could not find the specified token' })
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}

// Verify if a given token id is currently valid for a given user
handlers.tokens.verifyToken = (id, phone, callback) => {
  // Look up the token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true)
      } else {
        callback(false)
      }
    } else {
      callback(false)
    }
  })
}

// Checks handler
handlers.checks = (data, callback) => {
  const acceptableMethods = ['get', 'post', 'put', 'delete']
  if (acceptableMethods.lastIndexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Container for all the checks methods
handlers._checks = {}

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
  // Validate inputs
  const protocol = typeof (data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol: false
  const url = typeof (data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
  const method = typeof (data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
  const successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
  const timeoutSeconds = typeof (data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false 
    // Lookup the user by reading the token
    _data.read('tokens',token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone
        //Lookup the userdata
        _data.read('users', userPhone, (err, userData) => {
         if (!err && userData) {
           const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : []
           // Verify that the user has less than the number of max-checks-per-user
           if (userChecks.length < config.maxChecks) {
             // Create a random id for the check
             const checkId = helpers.createRandomString(20)

             // Create the check object, and include the user's phone
             const checkObject = {
               id: checkId,
               userPhone,
               protocol,
               url,
               method,
               successCodes,
               timeoutSeconds
             }

             // Save the object
             _data.create('checks', checkId, checkObject, err => {
               if (!err) {
                 // Add the checkId to the users object
                 userData.checks = userChecks
                 userData.checks.push(checkId)

                 // Save the new user data
                 _data.update('users', userPhone, userData, err => {
                  if (!err) {
                    // Return the data about the new check
                    callback(200, checkObject)
                  } else {
                    callback(500, {'Error': 'Could not update the user with the new check'})
                  }
                 })
               } else {
                 callback(500, {'Error': 'Could not create the new check'})
               }
             })
           } else {
             callback(400, {'Error': 'The user already have the maximum numbers of checks('+config.maxChecks+')'})
           }
         } else {
           callback(403)
         }
       })
      } else {
        callback(403)
      }
    })

  } else {
    callback(400, {'Error': 'Missing required imputs or inputs are invalid'})
  }
}

// Checks - get 
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  // Check that id provided is valid
  const id = typeof (data.queryString.id) === 'string' && data.queryString.id.length === 20 ? data.queryString.id : false
  if (id) {
    //Look up the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers
        const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
        // Verify that the given token is valid and belongs to the user who creates the check
        handlers.tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
          if (tokenIsValid) {
            // Return the check data
            callback(200, checkData)
          } else {
            callback(403, { 'Error': 'Missing required token in header, or invalid token' })
          }
        })
      } else {
        callback(404)
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}

// Checks - put 
// Required data: id
// Optional data: method, protocol, succesCodes, url, timeoutSeconds (one must be sent)
handlers._checks.put = (data, callback) => {
  // Check for the required field
  const id = typeof (data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id : false
  console.log(id)
  // Check for the optional fields
  const protocol = typeof (data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
  const url = typeof (data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
  const method = typeof (data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
  const successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
  const timeoutSeconds = typeof (data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

  // Check to be sure if the id is valid
  if (id) {
    // Error if nothig is sent to update
    if (protocol && url && method && successCodes && timeoutSeconds) {
      // Look up the check
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          // Get the token from the headers
          const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
          // Verify that the given token is valid and belongs to the user who creates the check
          handlers.tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
            if (tokenIsValid) {
              // Update the check where necessary
              if (protocol) {
                checkData.protocol = protocol
              }
              if (url) {
                checkData.url = url
              }
              if (method) {
                checkData.method = method
              }
              if (successCodes) {
                checkData.successCodes = successCodes
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds
              }

              // Store the new updates
              _data.update('checks', id, checkData, err => {
                if (!err) {
                  callback(200)
                } else {
                  console.log(err)
                  callback(500, { 'Error': 'Could not update the check' })
                }
              })
            } else {
              callback(403)
            }
          })
        } else {
          callback(400, { 'Error': 'Check ID did not exist' })
        }
      })
    } else {
      callback(400, { 'Error': 'Missing fields to update' })
    }

  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
  // Check that id  provided is valid
  const id = typeof (data.queryString.id) === 'string' && data.queryString.id.length === 20 ? data.queryString.id : false
  if (id) {
    //Look up the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
        // Verify that the given token is valid for the phone number
        handlers.tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
          if (tokenIsValid) {
            _data.delete('checks', id, err => {
              if (!err) {
                // Look up the user
                _data.read('users', checkData.userPhone, (err, userData) => {
                  if (!err && userData) {
                    const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : []

                    // Remove the deleted check from the lists of checks
                    const checkPosition = userChecks.indexOf(id)
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1)
                      // Re-save the user data
                      _data.update('users', checkData.userPhone, userData, err => {
                        if (!err) {
                          callback(200)
                        } else {
                          callback(500, {'Error': 'Could not delete the check'})
                        }
                      })
                    } else {
                      callback(500, {'Error': 'Could not find the check on the users object, so could not remove it'})
                    }
                  } else {
                    callback(500, {'Error': 'Could not find the user who creates the check'})
                  }
                })
              } else {
                callback(400, { 'Error': 'Could not delete the check data' })
              }
            })
          } else {
            callback(400, {'Error': 'Could not find the specified check'})
          }
        })
      } else {
        callback(400, {'Error': 'The specified check id does not exists'})
      }
    })
  } else {
    callback(400, { 'Error': 'Missing required field' })
  }
}


// Ping handler
handlers.ping = (data, callback) => {
  // Callback a http status code, and a payload object
  callback(200)
}

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404)
}


module.exports = handlers