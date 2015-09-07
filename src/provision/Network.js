/*
    The Network represents the entire state of all Server Clusters.
 */

var _ = require('underscore' ),
    Promise = require('bluebird')

function Network(region, clusters) {

    /*
        Class Scope Variables
     */

    this.region= region || "nyc3"

    this.clusters = clusters || []

}

/**
 *  Iterate over each cluster and run its provisioning.
 *
 *  @returns {Promise} Promise that is resolved upon a succesful provisioning of the Cluster.
 */
Network.prototype.provision = function() {

    var clusterProvisioning = _.map(this.clusters, function(cluster) {

        // Provide a back reference to the cluster
        cluster.network = this

        return cluster.provision()
    }, this)

    return Promise.all(clusterProvisioning)
}

module.exports = Network