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

# Seleccionar que no instalamos calamares aún
#sudo eggs prerequisites

#cambiar fondo de pantalla
sudo cp educaandos_wallpaper-plus.png /usr/share/backgrounds/educaandos_wallpaper.png

#instalar apps-guadalinex-20 en el sistema
wget https://bit.ly/3tJuZ5R -O apps-educaandos
chmod +x apps-educaandos
./apps-educaandos
./apps-educaandos

#copiar configuración para la ISO
sudo cp eggs.yaml /etc/penguins-eggs.d/
#sudo cp exclude.list /usr/local/share/penguins-eggs/exclude.list

#instalar calamares
#sudo eggs calamares
sudo apt-get update -y
sudo eggs calamares --install

#eliminar archivos innecesarios de EGGS
sudo rm /usr/share/applications/calamares.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-eggs.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-links-add.desktop

# paquetes necesarios para instalación en EFI secureboot
##sudo dpkg -i grub-efi-amd64-signed*amd64.deb
sudo apt-get install grub-efi-amd64-signed -y 
sudo apt-get install shim-signed -y

# instala lo necesario para la iso y borra scripts de creación de iso
sudo eggs produce -vs
sudo eggs kill

#Eliminar repositorio ubuntu
sudo rm /etc/apt/sources.list.d/focal.list
sudo apt-get update -y

#crear iso definitiva
sudo eggs produce -v
