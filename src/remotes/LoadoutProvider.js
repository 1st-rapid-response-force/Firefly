/*
    The Loadout Provider exposes a RPC endpoint that sock rpc can use to retrieve the players web based
     loadout.
 */

var popsicle = require('popsicle' ),
    _ = require('underscore')

/**
 * Initialize the RPC
 *
 * @param socket
 * @constructor {LoadoutProvider}
 */
function LoadoutProvider(socket) {

    // Register a handler to the socket
    socket.register('GET_LOADOUT', this.handleSocketEvent.bind(this))

}

LoadoutProvider.prototype.handleSocketEvent = function(uuid, callback) {

    // Retrieve the loadout and send it back
    var loadout = this.getLoadout(uuid)

    loadout.then((result) => {

        callback(null, result)

    })

}

/**
 * Retrieve a user's loadout from the web API and format it for use in the game engine.
 *
 * @param uuid
 * @returns {Promise} Promise that is resolved when the data is retrieved. Resolved with the loadout couplet
 */
LoadoutProvider.prototype.getLoadout = function(uuid) {

    // Request the loadout from the 1st RRF server
    var apiRequest = popsicle('https://1st-rrf.com/api/loadout/' + uuid)

    // Once the api Request is complete, reformat the the data into an array of couplets
    var formattedResponse = apiRequest.then((response) => {

        var loadoutArray = _.map(JSON.parse(response.body).loadout, (item) => {
            console.log(item)
            return [item.category, item.class_name]

        })

        console.log(loadoutArray)
        return loadoutArray

    })

    return formattedResponse

}

module.exports = LoadoutProvider