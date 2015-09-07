/*
    The Player Persistence Provider deals with the saving and restoring of the player state.
 */

var _ = require('underscore')

/**
 * Initialize the RPC provider
 *
 * @param socket
 * @constructor {LoadoutProvider}
 */
function LoadoutProvider(socket) {

    // Register a handler to the socket
    socket.register('SAVE_PLAYER', this.handleSocketEvent('SAVE_PLAYER'))
    socket.register('RESTORE_PLAYER', this.handleSocketEvent('RESTORE_PLAYER'))

}

LoadoutProvider.prototype.handleSocketEvent = function(event) {

    return (uuid, environment, contents, callback) => {

        if ( event === "SAVE_PLAYER" ) {

            callback(null)

            // Saving is a black box operation.
            // No persistence response is expected so the callback is returned to prevent a CPU block.
            var savePlayer = this.savePlayer(uuid, environment, contents)

        } else if ( event === "RESTORE_PLAYER" ) {

            // Because restoration does not make use of contents, move the arguments backwards to match
            callback = contents

            var restorePlayer = this.restorePlayer(uuid, environment)

            restorePlayer.then((result) => {
                callback(null, result)
            })

        }

    }

}

LoadoutProvider.prototype.savePlayer = function(uuid, environment, contents) {

    // Process the contents array into an object
    var contentsObject = _.object(_.unzip(contents))

    var playerState = {}

    // Start by saving the player's clothing and equipment
    playerState.clothing = {
        uniform: contentsObject.uniform,
        armour: contentsObject.armour,
        backpack: contentsObject.backpack
    }

    playerState.equipment = {
        map: contentsObject.map,
        radio: contentsObject.radio,
        gps: contentsObject.gps,
        compass: contentsObject.compass,
        watch: contentsObject.watch
    }

    playerState.headwear = {
        helmet: contentsObject.helmet,
        glasses: contentsObject.glasses,
        night_vision: contentsObject.night_vision,
    }

    // Save the players location
    playerState.location = {
        x: contentsObject.location_x,
        y: contentsObject.location_y,
        z: contentsObject.location_z
    }

    // Save the player's inventory by slot
    playerState.inventory = {
        uniform: contentsObject.uniformInventory,
        vest: contentsObject.vestInventory,
        backpack: contentsObject.backpackInventory
    }

}

LoadoutProvider.prototype.restorePlayer = function() {

}

module.exports = PlayerPersistenceProvider