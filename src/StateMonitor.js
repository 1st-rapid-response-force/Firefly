/*
    The state monitor keeps the current state of the cluster at all times.

    It is the role of the state monitor to ensure that the actual state of the cluster aligns with the desired state as
    well ensuring the integrity of the game state.

    This system is highly stateful and as such a shutdown should be performed gracefully to ensure that correct cleanup
    of the Digital Ocean servers occurs.
 */

function StateMonitor() {

    var clusters = {
        deployment: {
        },
        training: {

        },
        public: {

        }
    }

}

module.exports = StateMonitor