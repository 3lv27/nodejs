/*
 * Request handlers
 *
 */

// Dependencies

// Define the handlers
let handlers = {}

// User handler
handlers.users = function (data, callback) {
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
handlers._users.post = fucntion (data, callback) {
  // Check that all required fields are filled out
  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 6 ? data.payload.password.trim() : false
  const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? data.payload.tosAgreement : false

  if (firstName && lastName && phone && password && tosAgreement ) {
    
  } else {
    
  }
}
// Users - get
handlers._users.get = fucntion (data, callback) {

}
// Users - put
handlers._users.put = fucntion (data, callback) {

}
// Users - delete
handlers._users.delete = fucntion (data, callback) {

}

// Ping handler
handlers.ping = function (data, callback) {
  // Callback a http status code, and a payload object
  callback(200)
}

// Not found handler
handlers.notFound = function (data, callback) {
  callback(404)
}


module.exports = handlers