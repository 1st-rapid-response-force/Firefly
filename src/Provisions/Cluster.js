/*
    A cluster represents a connected group of servers that provide a single game space.

    In real terms this relates to a single dedicated server and attached clients as per configuration.

    A cluster holds the macroscopic configuration, but delegates detailed configurations to the individual sub components.
 */

var _ = require('underscore' ),
    bluebird = require('bluebird' ),
    DigitalOcean = bluebird.promisifyAll(require('digitalocean-api') ),
    ErrorHandler = require('../Adapters/ErrorHandler' ),
    nodemiral = require('nodemiral')

/**
 *
 * @param properties
 *
 *      Valid Properties:
 *          cluster_name: {String}
 *          region: {String} Digital Ocean Region to host in
 *          cluster_size: {Object}
 *              headless_no: {Integer} Number of Headless Clients to provision
 *              server_size: {String} Digital Ocean droplet size to use when provisioning dedicated server
 *              headless_size: {String} Digital Ocean droplet size to use for headless clients
 *          port: {Integer} Integer that the dedicated server will operate on
 *          server_name: {String} Name that the dedicated server will present
 *          map: {String} Full name of the map as located within the RRF S3 Bucket
 *          modlist: [{String}] Array of Mods by filename. Each mod will be copied from the RRF S3 Bucket.
 *          config: {Object}
 *              admin_password: {String} Admin password of the server.
 *              password: {String} If left as falsy this will default to no password
 *              max_players: {Integer} Defaults to 150. Cannot be less than one or more than 150.
 *              motd: [{String}] Messages to be broadcast to the server
 *              vote_threshold: {Integer} Integer between 0 and 101. Represents percentage of votes required.
 *              force_rotor_lib: {Boolean} Defaults to true. Forces rotor lib simulation for all helicopters.
 *          cfg: {Object} Affects network / CPU synergy. Not implemented.
 *
 * @constructor
 */
function Cluster(properties) {

    this.configuration = properties

    this.create = this.create.bind(this)

}

// Create the cluster
Cluster.prototype.create = function() {

    /*
        Provision the correct number of servers using the digital ocean API
    */

    // Provision the main server for the dedicated server
    var dedicatedServer = DigitalOcean.dropletsCreateNewDropletAsync(this.configuration.cluster_name + "-dedicated-server",
        this.configuration.region, this.configuration.cluster_size.server_size, "", {})

    // Provision a set of servers for the Headless Clients
    var headlessClients = []

    for (var i = 0; i < this.configuration.cluster_size.headless_no; i++) {

        var headlessClient = DigitalOcean.dropletsCreateNewDropletAsync(this.configuration.cluster_name + "-headless-client-" + i,
            this.configuration.region, this.configuration.cluster_size.headless_size, "", {})

        headlessClients.push(headlessClient)
    }

    var creationPromises = [dedicatedServer, bluebird.all(headlessClients)],
        preservedInstance = this

    Bluebird.all(creationPromises)
        .then(function(results) {

            // Open connections to each of the servers

            var dedicatedServerSession = bluebird.promisifyAll(nodemiral.session( results[ 0 ].ip, {
                username: 'root',
                pem: fs.readFile( '~/.ssh/id.pem' )
            }))

            var headlessClientSessions = _.map( results[ 1 ], function ( droplet ) {
                return bluebird.promisifyAll(nodemiral.session( droplet.ip, {
                    username: 'root',
                    pem: fs.readFile( '~/.ssh/id.pem' )
                }))
            } )

            // Save the sessions for later
            preservedInstance.dedicatedServerSession = dedicatedServerSession
            preservedInstance.headlessClientsSessions = headlessClientSessions

            return {
                dedicatedServer: dedicatedServerSession,
                headlessClients: headlessClientSessions
            }

        }).then(function(sessions) {

            // Install ARMA on all of the servers

            var options = {
                steam_username: "",
                steam_password: ""
            }

            var dedicatedServerInstaller = sessions.dedicatedServer.executeScriptAsync( "./scripts/install-arma.sh", options )

            var headlessClientsInstallers = _.map( sessions.headlessClients, function ( session ) {
                return session.executeScriptAsync( "./scripts/install-arma.sh", options )
            } )

            return bluebird.all( [ dedicatedServerInstaller, bluebird.all( headlessClientsInstallers ) ] )

        }).then(function(results) {

            // Setup the dedicated server

            var options = {
                server_name: "",
                maximum_players: "",
                messages_of_the_day: "",
                server_password: "",
                server_admin_password: "",
                server_command_password: "",
                vote_players: "",
                voteThreshold: "",
                headless_client_ips: "",
                mission_name: ""
            }

            return preservedInstance.dedicatedServerSession.executeScriptAsync("./scripts/dedicated-server.sh", options)

        }).catch(function(error) {

            ErrorHandler.fatal(error)

        })
}

Cluster.prototype.getStatus = function() {

}

module.exports = Cluster