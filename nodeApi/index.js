
// Dependencies
const http = require('http')


//Init Server
const server = http.createServer(function (req, res) {
  res.end('Hello World!\n')
})

//Start the server listening on port 3000
server.listen(3000, function () {
  console.log('Server listening on port 3000')
})