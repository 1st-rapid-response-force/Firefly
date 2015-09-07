# Title: Dedicated Server
# Author: Alexander Christie <alex@briefly.io>
# Terminal: Alex's Development Server [GCE EUW2] - Verification Signature: a4clf
# Purpose: Setup a dedicated server

#############################
#         Variables         #
#############################

# server_name - String - The name used to display the server to the public
# maximum_players - String - The maximum number of players the server supports.
# messages_of_the_day - Array[String] - An array of strings passed to the messages of the day.
# server_password - String - The password used by the server to authenticate connecting players
# server_admin_password - String - The password used by a user to assume Administrator responsibilities on the server.
# server_command_password - String - Alternate password used to authenticate scripting commands.
# rcon_password - String - Used by Firefly to connect and monitor
# vote_players - Integer - Number of players required to activate voting
# vote_threshold - Integer - Integer percentage required for affirmative vote.
# headless_client_ips - Array[String] - Array of the headless clients IPs for this server
# mission_name - String - The name of the mission file to download.
# rotor_lib_simulation - Integer - Rotor Lib Simulation


##########################
#         Script         #
##########################


# Change to ARMA directory
cd ~/arma


#
# Run Server.cfg generator
#

    # Hostname and Parameters

    echo 'hostname = "<%= server_name %>";' >> server.cfg
    echo 'maxPlayers = <%= maximum_players %>;' >> server.cfg
    echo 'logFile = "server_runtime_log.log";' >> server.cfg


    # Persistence and Logging

    echo 'persistent = 1;' >> server.cfg
    echo 'timeStampFormat = "full";' >> server.cfg


    # Rotor Lib Forced

    echo 'forceRotorLibSimulation = <%= rotor_lib_simulation %>;' >> server.cfg


    # Message of the Day

    #echo 'motd[] = {' >> server.cfg
    #echo '<%= messages_of_the_day %>' >> server.cfg
    #echo '};' >> server.cfg
    #echo 'motdInterval = 5;' >> server.cfg


    # Passwords

    echo 'password = "<%= server_password %>";' >> server.cfg
    echo 'passwordAdmin = "<%= server_admin_password %>";' >> server.cfg
    echo 'serverCommandPassword = "<%= server_command_password %>";' >> server.cfg


    # Voting

    echo 'voteMissionPlayers = <%= vote_players %>;' >> server.cfg
    echo 'voteThreshold = <%= vote_threshold %>;' >> server.cfg


    # VON - Disabled on all RRF servers

    echo 'disableVoN = 1;' >> server.cfg
    echo 'vonCodecQuality = 0;' >> server.cfg


    # Server Security

    echo 'kickDuplicate = 1;' >> server.cfg
    echo 'verifySignatures = 2;' >> server.cfg
    echo 'allowedFilePatching = 0;' >> server.cfg
    echo 'onUnsignedData = "kick (_this select 0)";' >> server.cfg
    echo 'onHackedData = "ban (_this select 0)";' >> server.cfg
    echo 'BattlEye = 1;' >> server.cfg
    echo 'allowedLoadFileExtensions[] = {"hpp","sqs","sqf","fsm","cpp","paa","txt","xml","inc","ext","sqm","ods","fxy","lip","csv","kb","bik","bikb","html","htm","biedi"};' >> server.cfg
    echo 'allowedPreprocessFileExtensions[] = {"hpp","sqs","sqf","fsm","cpp","paa","txt","xml","inc","ext","sqm","ods","fxy","lip","csv","kb","bik","bikb","html","htm","biedi"};' >> server.cfg
    echo 'allowedHTMLLoadExtensions[] = {"htm","html","xml","txt"};' >> server.cfg


    # Mission Setup
    # Not worked this one out yet


    # Headless Clients

    echo 'localClient[]={<%= headless_client_ips %>};' >> server.cfg
    echo 'headlessClients[]={<%= headless_client_ips %>};' >> server.cfg

#
# Download mission file used by this server
#

    # Download missions from asset server

    cd ~/arma/mpmissions
    wget "http://content.1st-rrf.com/missions/<%= mission_name %>"

#
# Setup the BE Config
#

    # Move to BE Directory

    cd ~/arma/battleye


    # Write out admin password so that RCon Monitor can connect later

    echo 'Rconpassword  <%= rcon_password %>' >> BE.cfg