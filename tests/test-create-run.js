// Create a Cluster

/*
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
*/

var testProperties = {
    cluster_name: "Test-Name",
    cluster_size: {
        headless_no: 1,
        server_size: '4gb',
        headless_size: '1gb'
    },
    port: 2302,
    server_name: 'Testing the Setup',
    map: 'map.Altis',
    modList: "",
    config: {
        admin_password: "test",
        password: "test",
        max_players: "more_test",
        motd: [""],
        vote_threshold: "101",
        force_rotor_lib: "1"
    }
}

var cluster = new (require('../src/Provisions/Cluster'))(testProperties ),
    dotenv = require('dotenv')

dotenv.load()

cluster.create().then(function() {
    console.log('Finished')
}).then(function() {
    cluster.start()
})