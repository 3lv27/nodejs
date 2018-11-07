// Dependencies
const server = require('./lib/server.js')
const workers = require('./lib/workers')

// Declare the app
let app = {}

// Init function 
app.init = () => {
	// Start the server
	server.init()

	// Start the workers
	workers.init()
}

// Execute the app
app.init()

// Export
module.exports = app