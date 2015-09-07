/*
    Test that a droplet is created and promptly reported active
 */
var dotenv = require('dotenv')

dotenv.load()

var Cluster = require('../src/provision/Cluster' ),
    Network = require('../src/provision/Network' )

// Create a Server
var cluster = new Cluster("creation-test-two", "[1RRF] Test Server", 0, 'test', 'test')

var network = new Network('nyc3', [cluster])

network.provision().then(() => {
    console.log('Your server is ready!')
}).then(() => {
    cluster.start()
})