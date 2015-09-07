/*
    A server represents a unique virtual resource in a cluster.

    On DigitalOcean this would be a droplet.
 */

var DigitalOcean = require('dropletapi' ).Droplets,
    Promise = require('bluebird' ),
    _ = require('underscore' ),
    Remote = require('nodemiral' ),
    fs = require('fs')

function Server(name, cluster, profile, size) {

    /*
        Class Scope Variables
     */

    this.name = name || "replace-me"
    this.cluster = cluster
    this.id = 0
    this.size = size
    this.status = "new"
    this.profile = profile

    this.ip = {
        private_ip: "",
        public_ip: ""
    }

    this.session = null
}

/**
 * Provision the server and initialize it.
 *
 * @returns {Promise} Promise is resolved when the server is setup
 */
Server.prototype.create = function() {

    // Create a Digital Ocean droplet for this server
    var dropletSettings = {
        "name": this.name,
        "region": this.cluster.network.region,
        "size": this.size,
        "image": "ubuntu-14-04-x64",
        "ssh_keys": [parseInt(process.env.KEY_ID)],
        "backups": false,
        "private_networking": true
    }

    var creationStatus = this.DigitalOceanClient.createDropletAsync(dropletSettings).bind(this)

    // Store the Digital Ocean id for later retrieval
    var queryResult = creationStatus.then((result) => {
        this.id = result.droplet.id
        this.status = result.droplet.status

    })


    // Query the digital ocean api every ten seconds until the server is active
    var activatedServer = queryResult.then(() => {

        var preservedReference = this

        // Define a new promise that will be resolved when the server is active
        var createdPromise = new Promise((resolve, reject) => {
            preservedReference.waitForActive(resolve)
        })

        // Return the promise
        return createdPromise

    })

    // Once the droplet is active, run initialization
    return activatedServer.bind(this).then(this.initialize)

}

/**
 * Wait until the status of the server is active.
 *
 * @returns {Promise} The promise is resolved once the server is active
 */
Server.prototype.waitForActive = function(success) {

    // Query the api once every 30 seconds
    var query = this.updateStatus().delay(15000).bind(this)

    return query.then(() => {
        // Check the status of the droplet
        if ( this.status !== "active" ) {
            return this.waitForActive(success)
        } else {
            // Mark the success
            success()
        }
    })

}

/**
 * Query the Digital Ocean API to get the current status of this droplet.
 *
 * @returns {Promise} Promise is complete once the status is updated
 */
Server.prototype.updateStatus = function() {

    // Build a query
    var queryResult = this.DigitalOceanClient.getDropletByIdAsync(this.id)

    // Set the status to the result
    queryResult.bind(this).then((result) => {
        var networks = result.droplet.networks

        this.status = result.droplet.status

        if ( ! _.isEmpty(networks) && ! _.isEmpty(networks.v4)) {
            this.ip.private_ip = networks.v4[0].ip_address
            this.ip.public_ip = networks.v4[1].ip_address
        }

    })

    return queryResult

}

/**
 * Install the software required for the server to fufill its role.
 *
 * This installs the base ARMA game, but does not make customizations that are profile specific.
 *
 * @returns {Promise} Promise is resolved when the profile is installed
 */
Server.prototype.initialize = function() {

    // Open and save a connection tunnel to the server
    this.session = Promise.promisifyAll(Remote.session(this.ip.public_ip, {
        username: 'root',
        pem: fs.readFileSync( process.env.HOME + '/.ssh/id_rsa', 'utf8' ),
        keepAlive: true,
        readyTimeout: 99999
    }))

    // Install ARMA III - Setup steam credentials
    var steam_credentials = {
        vars: {
            steam_username: process.env.STEAM_USERNAME,
            steam_password: process.env.STEAM_PASSWORD
        }
    }

    var installerProgress = this.session.executeScriptAsync( process.cwd() + "/src/provision/scripts/install-arma.sh", steam_credentials )

    if ( this.profile === "server" ) {

        // Also install dedicated server parameters if the profile requires it

        var serverProgress = installerProgress.then(() => {

            var server_options = {
                server_name: this.cluster.formattedName,
                maximum_players: 150,
                messages_of_the_day: JSON.stringify([""]),
                server_password: this.cluster.password,
                server_admin_password: this.cluster.admin_password,
                server_command_password: this.cluster.admin_password,
                rcon_password: process.env.RCON_PASSWORD,
                vote_players: 0,
                vote_threshold: 101,
                headless_client_ips: JSON.stringify(preservedInstance.state.headlessIPs),
                mission_name: 'test.Altis',
                rotor_lib_simulation: 1
            }

            this.session.executeScriptAsync( process.cwd() + "/src/provision/scripts/dedicated-server.sh", server_options )
        })

        return serverProgress

    }

    return installerProgress
}

Server.prototype.start = function() {

    // Check that no server is currently running
    var stopCheck = this.stop()

    // Once there is a confirmation that no server is running, compose the startup line
    var paramaters = {

    }

    // Finalize the paramaters into a string
    var startString = "./arma3server"

    startString = _.reduce(paramaters, (memo, value, index) => {

        // For each parameter, break it down into a string
        var parameterString = " -" + index + "=" + value

        return memo + parameterString

    }, startString)

    // Execute the command on the remote server. Make use of nohup to make sure that if connection is detached server
    //  continues to execute.

    var execString = "cd ~/arma && nohup " + startupCommand + " > server_console_log.out 2> server_error_log.err < /dev/null &"

    var execPromise = stopCheck.bind(this).then(() => {
        this.session.executedAsync(execString)
    })

    return execPromise
}

/**
 * Stops the running server if there is one.
 *
 * Useful for cleaning up before running a new start.
 *
 * @returns {Promise} A promise that is resolved when the server is confirmed not to be running.
 */
Server.prototype.stop = function () {


}

Server.prototype.destroy = function() {

}

Server.prototype.DigitalOceanClient = Promise.promisifyAll(new DigitalOcean(process.env.DIGITAL_OCEAN_TOKEN))

module.exports = Server