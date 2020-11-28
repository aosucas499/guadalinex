#!/bin/bash
#wget http://centros.edu.guadalinex.org/Edu/focal/pool/main/c/cga-sourceslist-config/cga-sourceslist-config_0.3-2_all.deb
#sudo dpkg -i cga-sourceslist-config_0.3-2_all.deb 
#sudo rm *.deb
#echo "deb [arch=amd64] http://centros.edu.guadalinex.org/Edu/focal educaandos main" > /etc/apt/sources.list

sudo echo "deb [arch=amd64] http://centros.edu.guadalinex.org/Edu/focal educaandos main" > /etc/apt/sources.list.d/guadalinex.list
sudo apt -o Acquire::AllowInsecureRepositories=yes update -y --allow-unauthenticated
sudo apt -o Acquire::AllowInsecureRepositories=yes upgrade -y --allow-unauthenticated
#sudo apt -o Acquire::AllowInsecureRepositories=yes install -y --allow-unauthenticated gnome-terminal
#sudo apt -o Acquire::AllowInsecureRepositories=yes install -y --allow-unauthenticated guadalinexedu-educacion-tic
#sudo apt -o Acquire::AllowInsecureRepositories=yes install -y --allow-unauthenticated cga-security
#sudo apt -o Acquire::AllowInsecureRepositories=yes install -y --allow-unauthenticated ubuntu-session
#sudo service gdm3 start

