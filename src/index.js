var socket = require('sock-rpc' ),
    dotenv = require('dotenv')

dotenv.load()

var loadoutEndpoint = new (require('./remotes/LoadoutProvider'))(socket)

// Provision servers for Private and Training server
var Cluster = require('../src/provision/Cluster' ),
    Network = require('../src/provision/Network' )

var private_server = new Cluster("deployment-environment", "[1RRF] Deployment Server", 0, 'relentless', 'catscradle')

socket.listen()