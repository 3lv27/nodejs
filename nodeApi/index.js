
// Dependencies
const http = require('http')
const https = require('https')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const config = require('./lib/config')
const fs = require('fs')
const handlers = require('./lib/handlers')
const helpers = require('./lib/helpers')

// Instantiate the HTTP server
const httpServer = http.createServer((req, res) => {
  unifiedServers(req, res)
})

// Start the HTTP server
httpServer.listen(config.httpPort, () => {
	console.log('> HTTP server listening on port', config.httpPort, 'in', config.envName, 'mode')
})

// Instantiate the HTTPS server
let httpsServerOptions = {
	'key': fs.readFileSync('./https/key.pem'),
	'cert': fs.readFileSync('./https/cert.pem')
}
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
	unifiedServers(req, res)
})

// Start the HTTPS server
httpsServer.listen(config.httpsPort, () => {
	console.log('> HTTPS server listening on port', config.httpsPort, 'in', config.envName, 'mode')
})

// All the server logic for both the http and https servers
const unifiedServers = function (req, res) {
	// Get the URL and parse it
	const parsedUrl = url.parse(req.url, true)

	// Get the path
	const path = parsedUrl.pathname
	const trimmedPath = path.replace(/^\/+|\/+$/g, '')

	// Get the query string as an object
	const queryStringObject = parsedUrl.query

	// Get the HTTP method
	const method = req.method.toLowerCase()

	// Get the headers as an object
	const headers = req.headers

	// Get the payload, if any
	const decoder = new StringDecoder('utf-8')

	let buffer = ''

	req.on('data', data => buffer += decoder.write(data))

	req.on('end', () => {
		buffer += decoder.end()

		// Choose the handler this request should go to. If one is not found use the notFound handler
		const chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound

		// Construct the data object to send to the handler
		const data = {
			'path': trimmedPath,
			'queryString': queryStringObject,
			'method': method,
			'headers': headers,
			'payload': helpers.parseJsonToObject(buffer)
		}

		//** Route the request to the handler specified in the router
		chosenHandler(data, (statusCode, payload) => {
			// Use the status code called back by the handler, or the dafault to 200
			statusCode = typeof (statusCode) === 'number' ? statusCode : 200

			// Use the payload called back by the handler, or the dafault to an empty object
			payload = typeof (payload) === 'object' ? payload : {}

			// Convert the payload to a string
			const payloadString = JSON.stringify(payload)

			// Return the response
			res.setHeader('Content-Type', 'application/json')
			res.writeHead(statusCode)
			res.end(payloadString)

			//Log the request path
			console.log('Returning this response: ', statusCode, payloadString)

		})
	})
}

// Define a request router
const router = {
	'ping': handlers.ping,
	'users': handlers.users,
	'tokens': handlers.tokens,
	'checks': handlers.checks,
}
