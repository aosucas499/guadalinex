#!/bin/bash 
wget --no-check-certificate --content-disposition https://github.com/aosucas499/sources/raw/main/focal-sources.list
sudo mv focal-sources.list /etc/apt/sources.list.d/focal.list
sudo apt update 
sudo apt install archdetect-deb dialog casper squashfs-tools discover aufs-tools unionfs-fuse plymouth-x11 -y
sudo dpkg -i pinguy*
sudo rm /etc/apt/sources.list.d/focal.list
sudo apt update 
sudo cp PinguyBuilder /usr/bin
sudo cp PinguyBuilder.conf /etc
