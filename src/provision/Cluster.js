/*
    The Cluster represents a single group of servers clustered around a single dedicated server.

    They are linked over a private network connection.
 */

var _ = require('underscore' ),
    Promise = require('bluebird' ),
    Server = require('./Server')

function Cluster(name, formattedName, headless_clients, password, admin_password) {

    /*
        Class Scope Variables
     */

    this.name = name || "replace-in-firefly"
    this.formattedName = formattedName || "Change me in Firefly"
    this.headless_client_number = headless_clients || 0
    this.password = password || ""
    this.admin_password = admin_password || "resetMe"

    this.servers = []

}

/**
 * Provision the Cluster and run provisioning on each of the servers.
 *
 * @returns {Promise} A promise that is resolved when the Cluster is established
 */
Cluster.prototype.provision = function() {

    // Provision one dedicated server
    var dedicatedServer = new Server(this.name + '-dedicated-server', this, 'server', "4gb")
    this.servers.push(dedicatedServer)
    var dedicatedServerProcessing = dedicatedServer.create()


    // And the required number of headless clients
    var headlessClientsProcessing = []

    for (var i = 0; i < this.headless_client_number; i++ ) {

        var headlessClient = new Server(this.name + '-headless-client-' + i, this, 'client', "1gb")

        this.servers.push(headlessClient)

        headlessClientsProcessing.push(headlessClient.create())

    }

    return Promise.all([dedicatedServerProcessing, Promise.all(headlessClientsProcessing)])

}

/**
 * Start all servers in the Cluster
 *
 * @returns {Promise} A promise that is resolved when the Cluster is established
 */
Cluster.prototype.start = function() {

    // Iterate over each server and issue the start command
    var startups = _.map(this.servers, function(server) {
        return server.start()
    })

    return Promise.all(startups)

}

module.exports = Cluster