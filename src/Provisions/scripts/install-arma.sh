# Title: Install ARMA
# Author: Alexander Christie <alex@briefly.io>
# Terminal: Alex's Development Server [GCE EUW2] - Verification Signature: a4clf
# Purpose: Install ARMA onto a Ubunutu server

#############################
#         Variables         #
#############################

# steam_username - String - Username used to login to Steam
# steam_password - String - Password used to login to Steam

##########################
#         Script         #
##########################


# Install dependencies

    sudo apt-get update
    sudo apt-get install lib32stdc++6 libc6-i386 lib32gcc1
    sudo apt-get install wget
    sudo apt-get install unzip


# Setup install directories

    cd ~
    mkdir steam
    mkdir arma


# Download SteamCMD

    cd steam
    wget http://media.steampowered.com/client/steamcmd_linux.tar.gz
    tar -xvzf steamcmd_linux.tar.gz
    rm steamcmd_linux.tar.gz


# Run SteamCMD and install ARMA III
    ./steamcmd.sh +login <%= steam_username %> <%= steam_password %> +force_install_dir ../arma +app_update 233780 +validate +quit


# Install RRF Modpack
    #cd ../arma
    #wget "http://content.1st-rrf.com/Modpack.zip"
    #unzip Modpack.zip
    #rm -rf Modpack.zip

# Install SockRPC
    wget "https://bitbucket.org/micovery/sock.dll/raw/v0.0.2/Release/sock.so"