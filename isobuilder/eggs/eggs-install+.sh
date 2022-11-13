#!/bin/bash 

# Instalar repo ubuntu y paquetes eggs
sudo rm /etc/apt/sources.list.d/focal.list
wget --no-check-certificate --content-disposition https://github.com/aosucas499/sources/raw/main/focal-sources.list
sudo mv focal-sources.list /etc/apt/sources.list.d/focal.list
sudo apt-get update -y 
sudo apt-get install git -y
wget https://sourceforge.net/projects/penguins-eggs/files/DEBS/testing/eggs_9.3.8_amd64.deb
sudo dpkg -i eggs*.deb
sudo apt-get install -f -y

#instalar apps-guadalinex-20 en el sistema
wget https://bit.ly/3tJuZ5R -O apps-educaandos
chmod +x apps-educaandos
./apps-educaandos
./apps-educaandos

# Modificar los grupos que instalará calamares al nuevo usuario
sudo cp /home/$USER/guadalinex/isobuilder/eggs/educaandos/theme/calamares/modules/users.yml /usr/lib/penguins-eggs/conf/distros/focal/calamares/modules/users.yml

# modificar eggs para que cree los grupos del nuevo usuario si el tema es guadalinex
#sudo cp /home/$USER/guadalinex/isobuilder/eggs/ovary.js /usr/lib/penguins-eggs/dist/classes/ovary.js

#copiar configuración para la ISO
sudo cp -r /home/$USER/guadalinex/isobuilder/eggs/educaandos /usr/lib/penguins-eggs/addons/

#instalar calamares
#sudo eggs calamares
sudo apt-get update -y
sudo eggs calamares --install --theme educaandos

# tenemos que modificar el archivo eggs.yaml a mano e incluir el vmlinuz y initrd con la versión, no dejar sin la versión.
# así como los lenguajes, Europe/Madrid para la hora
#sudo cp eggs.yaml /etc/penguins-eggs.d/
#sudo cp exclude.list /usr/local/share/penguins-eggs/exclude.list

# Con el siguiente comando le decimos que si a instalar calamares
sudo eggs config
sudo eggs status

#eliminar archivos innecesarios de EGGS
sudo rm /usr/share/applications/calamares.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-eggs.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-links-add.desktop

# paquetes necesarios para instalación en EFI secureboot
##sudo dpkg -i grub-efi-amd64-signed*amd64.deb
#sudo apt-get install grub-efi-amd64-signed -y 
sudo apt update -y 
sudo apt-get install shim-signed -y

# instala lo necesario para la iso y borra scripts de creación de iso
sudo eggs dad -d
sudo eggs produce --fast --theme guadalinex
sudo eggs kill

#Eliminar repositorio ubuntu
sudo rm /etc/apt/sources.list.d/focal.list
sudo apt-get update -y

#crear iso definitiva
sudo eggs produce -v --theme guadalinex
