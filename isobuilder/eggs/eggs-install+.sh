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

#instalar calamares (and configure it to act without root)
sudo eggs calamares --install

# I usually use: sudo apt-get install grub-efi-amd64-bin
sudo apt-get install shim-signed -y

# Modificar los grupos que instalará calamares al nuevo usuario
sudo cp /home/$USER/guadalinex/isobuilder/eggs/educaandos/theme/calamares/modules/users.yml /usr/lib/penguins-eggs/conf/distros/focal/calamares/modules/users.yml

# NOW, we configure eggs, whit it's default 
sudo eggs dad -d

# Tenemos que modificar el archivo eggs.yaml a mano e incluir el vmlinuz y initrd con la versión, no dejar sin la versión.
# así como los lenguajes, Europe/Madrid para la hora. Usar # sudo nano /etc/penguins-eggs.d/eggs.yaml después de estos dos comandos.
sudo nano /etc/penguins-eggs.d/eggs.yaml

# iso creation fast
# For developer version:
# sudo eggs produce --fast --theme educaandos 

# crear iso definitiva
# sudo eggs produce --max --theme educaandos --release
