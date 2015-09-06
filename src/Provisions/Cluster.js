/*
    A cluster represents a connected group of servers that provide a single game space.

    In real terms this relates to a single dedicated server and attached clients as per configuration.

    A cluster holds the macroscopic configuration, but delegates detailed configurations to the individual sub components.
 */

var _ = require('underscore' ),
    bluebird = require('bluebird'),
    DigitalOceanAPI = require('dropletapi' ).Droplets,
    DigitalOcean = bluebird.promisifyAll(new DigitalOceanAPI("99076353273c5a2682f71ee839bae38af366b52b9cc4e45335b47ad8571bfb25")),
    ErrorHandler = require('../Adapters/ErrorHandler' ),
    nodemiral = require('nodemiral' ),
    fs = require('fs')

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

    this.state = {
        dedicatedIP: "",
        headlessIPs: []
    }

}

// Create the cluster - Returns a promise that resolves when creation is complete
Cluster.prototype.create = function() {

    /*
        Provision the correct number of servers using the digital ocean API
    */

    // Provision the main server for the dedicated server

    var dedicatedServerSpecification = {
        name: "firefly-" + this.configuration.cluster_name + '-dedicated-server',
        region: process.env.DEPLOYMENT_REGION,
        size: this.configuration.cluster_size.server_size,
        image: "ubuntu-14-04-x64",
        ssh_keys: [103438],
        ipv6: true,
        private_networking: true
    }

    var dedicatedServer = DigitalOcean.createDropletAsync(dedicatedServerSpecification)

    // Provision a set of servers for the Headless Clients
    var headlessClients = []

    var headlessClientSpecification = {
        "region": process.env.DEPLOYMENT_REGION,
        "size": this.configuration.cluster_size.headless_size,
        "image": "ubuntu-14-04-x64",
        "ssh_keys": [103438],
        "ipv6": true,
        "private_networking": true
    }

    for (var i = 0; i < this.configuration.cluster_size.headless_no; i++) {

        var config = headlessClientSpecification

        config.name = "firefly-" + this.configuration.cluster_name + '-headless-client-' + i

        var headlessClient = DigitalOcean.createDropletAsync(config)

        headlessClients.push(headlessClient)
    }

    var creationPromises = [dedicatedServer, bluebird.all(headlessClients)],
        preservedInstance = this

    console.log('Server Created')

    return bluebird.all(creationPromises)
        .delay(60000 * 2.75)
        .then(function(results) {

            console.log('Retrieving Droplet Networking Addresses')

            var responseArray = []

            // Query the Droplet API to find the network addresses of the droplets.
            responseArray[0] = DigitalOcean.getDropletByIdAsync(results[0].droplet.id)

            responseArray[1] = bluebird.all(_.map(results[1], function(droplet) {
                return DigitalOcean.getDropletByIdAsync(droplet.droplet.id)
            }))

            return bluebird.all(responseArray)

        }).then(function(results) {

            console.log('Creating SSH Connections')

            // Store the droplet's private IPs
            var serverIP = preservedInstance.state.dedicatedIP = results[0].droplet.networks.v4[0].ip_address

            _.forEach(results[1], function(droplet) {
                preservedInstance.state.headlessIPs.push(droplet.droplet.networks.v4[0].ip_address)
            })

            console.log(serverIP)

            // Open connections to each of the servers
            var dedicatedServerSession = bluebird.promisifyAll(nodemiral.session( results[0].droplet.networks.v4[1].ip_address, {
                username: 'root',
                pem: fs.readFileSync( process.env.HOME + '/.ssh/id_rsa', 'utf8' ),
                keepAlive: true,
                readyTimeout: 99999
            }))

            var headlessClientSessions = _.map( results[ 1 ], function ( droplet ) {
                return bluebird.promisifyAll(nodemiral.session( droplet.droplet.networks.v4[1].ip_address, {
                    username: 'root',
                    pem: fs.readFileSync( process.env.HOME + '/.ssh/id_rsa', 'utf8' ),
                    keepAlive: true,
                    readyTimeout: 99999
                }))
            })

            // Save the sessions for later
            preservedInstance.dedicatedServerSession = dedicatedServerSession
            preservedInstance.headlessClientsSessions = headlessClientSessions

            return {
                dedicatedServer: dedicatedServerSession,
                headlessClients: headlessClientSessions
            }

        }).then(function(sessions) {

            // Install ARMA on all of the servers

            console.log('Installing ARMA')

            var options = {
                vars: {
                    steam_username: "23rdgamediv",
                    steam_password: "3xW65MAiVx9n"
                }
            }

            console.log(sessions.dedicatedServer)
            var dedicatedServerInstaller = sessions.dedicatedServer.executeScriptAsync( process.cwd() + "/src/Provisions/scripts/install-arma.sh", options )

            var headlessClientsInstallers = _.map( sessions.headlessClients, function ( session ) {
                return session.executeScriptAsync( process.cwd() + "/src/Provisions/scripts/install-arma.sh", options )
            } )

            return bluebird.all( [ dedicatedServerInstaller, bluebird.all( headlessClientsInstallers ) ] )

        }).then(function(results) {

            // Setup the dedicated server

            console.log('Preparing dedicated server settings')

            var options = {
                vars: {
                    server_name: preservedInstance.configuration.server_name,
                    maximum_players: 150,
                    messages_of_the_day: preservedInstance.configuration.config.motd,
                    server_password: preservedInstance.configuration.config.password,
                    server_admin_password: preservedInstance.configuration.config.admin_password,
                    server_command_password: preservedInstance.configuration.config.admin_password,
                    rcon_password: process.env.RCON_PASSWORD,
                    vote_players: 0,
                    vote_threshold: 101,
                    headless_client_ips: JSON.stringify(preservedInstance.state.headlessIPs),
                    mission_name: preservedInstance.configuration.map,
                    rotor_lib_simulation: preservedInstance.configuration.config.force_rotor_lib
                }
            }

            return preservedInstance.dedicatedServerSession.executeScriptAsync( process.cwd() + "/src/Provisions/scripts/dedicated-server.sh", options)

        }).catch(function(error) {

            ErrorHandler.fatal(error)

        })
}

// Start the server - Returns a promise when the server network has been sucesfully started.
Cluster.prototype.start = function () {

    // Create the dedicated server start command

    var startupCommand = "./arma3server -nosplash -maxMem=2047 -name=server -profiles=profiles " +
        "-port=" + this.configuration.port + " -pid='firefly.pid' -config=server.cfg -autoInit"

    console.log(startupCommand)

    // Use the connection to the dedicated server and spawn an instance of the game

    var dedicatedServer = this.dedicatedServerSession
        .executeAsync('cd arma && nohup ' + startupCommand + ' > server_console_log.out 2> server_error_log.err < /dev/null &', {})


    // Create the headless client start commands

    var headlessClientCommand = "./arma3server -client -connect=" + this.state.dedicatedIP + " -password=" + this.configuration.config.password

    console.log(headlessClientCommand)

    var headlessClients = _.map(this.headlessClientsSessions, function(session) {
        return session.executeAsync('cd arma && nohup ' + headlessClientCommand + ' > server_console_log.out 2> server_error_log.err < /dev/null &', {})
    })

    return [dedicatedServer, headlessClients]

}

Cluster.prototype.getStatus = function() {

}

module.exports = Cluster