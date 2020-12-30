#!/bin/bash 
sudo rm /etc/apt/sources.list.d/focal.list
wget --no-check-certificate --content-disposition https://github.com/aosucas499/sources/raw/main/focal-sources.list
sudo mv focal-sources.list /etc/apt/sources.list.d/focal.list
sudo apt-get update -y 
sudo apt-get install git -y
wget https://sourceforge.net/projects/penguins-eggs/files/packages-deb/eggs_7.7.0-1_amd64.deb 
sudo dpkg -i eggs*.deb
#sudo cp install-debian.desktop /usr/lib/penguins-eggs/addons/eggs/theme/applications/
sudo cp show.qml /usr/lib/penguins-eggs/addons/eggs/theme/branding/show.qml
sudo cp slide.png /usr/lib/penguins-eggs/addons/eggs/theme/branding/welcome.png
sudo cp slide.png /usr/lib/penguins-eggs/addons/eggs/theme/branding/slide1.png
sudo cp slide.png /usr/lib/penguins-eggs/addons/eggs/theme/branding/slide1.png
sudo cp slide.png /usr/lib/penguins-eggs/addons/eggs/theme/branding/slide2.png
sudo cp slide.png /usr/lib/penguins-eggs/addons/eggs/theme/branding/slide3.png
sudo cp slide.png /usr/lib/penguins-eggs/addons/eggs/theme/branding/slide4.png
sudo cp slide.png /usr/lib/penguins-eggs/addons/eggs/theme/branding/slide5.png
sudo cp slide.png /usr/lib/penguins-eggs/addons/eggs/theme/branding/slide6.png
sudo cp slide.png /usr/lib/penguins-eggs/addons/eggs/theme/branding/slide7.png
sudo eggs prerequisites
sudo cp eggs.conf /etc/penguins-eggs.d/eggs.conf
sudo rm /etc/apt/sources.list.d/focal.list
sudo apt-get update -y

