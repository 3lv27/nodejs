
// Dependencies
const http = require('http')
const url = require('url')


//Init Server
const server = http.createServer((req, res) => {

	//Get the URL and parse it
	const parsedUrl = url.parse(req.url, true)

	//Get the path
	const path = parsedUrl.pathname
	const trimmedPath = path.replace(/^\/+|\/+$/g,'')

	//Get the query string as an object
	const queryStringObject = parsedUrl.query

	//Get the HTTP method
	const method = req.method.toLowerCase()

	//Get the headers as an object
	const headers = req.headers

	//Send the response
	res.end('Hello World!\n')

	//Log the request path
	console.log('Request received with this headers: ', headers)

  
})

//Start the server listening on port 3000
server.listen(3000, () => {
  console.log('Server listening on port 3000')
})