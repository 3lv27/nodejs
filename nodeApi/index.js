
// Dependencies
const http = require('http')
const url = require('url')


//Init Server
const server = http.createServer(function (req, res) {

	//Get the URL and parse it
	const parsedUrl = url.parse(req.url, true)

	//Get the path
	const path = parsedUrl.pathname
	const trimmedPath = path.replace(/^\/+|\/+$/g,'')

	//Send the response
	res.end('Hello World!\n')

	//Log the request path
	console.log('Request received on this path: ', trimmedPath)


  
})

//Start the server listening on port 3000
server.listen(3000, function () {
  console.log('Server listening on port 3000')
})