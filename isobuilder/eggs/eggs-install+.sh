#!/bin/bash 

# Instalar repo ubuntu y paquetes eggs
sudo rm /etc/apt/sources.list.d/focal.list
wget --no-check-certificate --content-disposition https://github.com/aosucas499/sources/raw/main/focal-sources.list
sudo mv focal-sources.list /etc/apt/sources.list.d/focal.list
sudo apt-get update -y 
sudo apt-get install git -y
wget https://sourceforge.net/projects/penguins-eggs/files/DEBS/versions/eggs_9.3.7_amd64.deb
sudo dpkg -i eggs*.deb
sudo apt-get install -f -y

#instalar apps-guadalinex-20 en el sistema
wget https://raw.githubusercontent.com/aosucas499/guadalinex/slim/src/apps-educaandos -O apps-educaandos
chmod +x apps-educaandos
./apps-educaandos
./apps-educaandos

#copiar theme educaandos para la ISO
sudo cp -r /home/$USER/guadalinex/isobuilder/eggs/educaandoslim /usr/lib/penguins-eggs/addons/

# Modificar los grupos que instalará calamares al nuevo usuario (no necesario versión 9.3.8 eggs)
sudo cp /home/$USER/guadalinex/isobuilder/eggs/educaandoslim/theme/calamares/modules/users.yml /usr/lib/penguins-eggs/conf/distros/focal/calamares/modules/users.yml

#instalar calamares (and configure it to act without root)
sudo eggs calamares --install --theme educaandoslim

# paquetes necesarios para instalación en EFI secureboot
#sudo dpkg -i grub-efi-amd64-signed*amd64.deb
sudo apt update -y 
sudo apt-get install grub-efi-amd64-signed -y 
sudo apt-get install shim-signed -y

#eliminar archivos innecesarios de EGGS
sudo rm /usr/share/applications/calamares.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-eggs.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-links-add.desktop

# NOW, we configure eggs, whit it's default 
sudo eggs dad -d

# Modify settings for iso
#sudo nano /etc/penguins-eggs.d/eggs.yaml
sudo cp eggs.yaml /etc/penguins-eggs.d/

# instala lo necesario para la iso y borra scripts de creación de iso
sudo eggs produce -vs --theme educaandoslim
sudo eggs kill

#Eliminar repositorio ubuntu
sudo rm /etc/apt/sources.list.d/focal.list
sudo apt-get update -y
sudo eggs tools skel

#crear iso definitiva
sudo eggs produce -v --theme educaandoslim 
