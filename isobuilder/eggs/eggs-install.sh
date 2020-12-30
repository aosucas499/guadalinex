#!/bin/bash 

# Instalar repo ubuntu y paquetes eggs
sudo rm /etc/apt/sources.list.d/focal.list
wget --no-check-certificate --content-disposition https://github.com/aosucas499/sources/raw/main/focal-sources.list
sudo mv focal-sources.list /etc/apt/sources.list.d/focal.list
sudo apt-get update -y 
sudo apt-get install git -y
wget https://sourceforge.net/projects/penguins-eggs/files/packages-deb/eggs_7.7.0-1_amd64.deb 
sudo dpkg -i eggs*.deb

# Modificar calamares e instalar 
sudo cp install-debian.desktop /usr/lib/penguins-eggs/addons/eggs/theme/applications/
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
sudo eggs calamares


#copiar configuración para la ISO
sudo cp eggs.conf /etc/penguins-eggs.d/eggs.conf

#Modificar grub del live ISO
sudo cp splash.png /usr/lib/penguins-eggs/assets/penguins-eggs-splash.png
sudo cp theme.cfg /usr/lib/penguins-eggs/conf/distros/buster/grub/theme.cfg
sudo cp menu.template.cfg /usr/lib/penguins-eggs/conf/distros/focal/isolinux/menu.template.cfg


#eliminar archivos innecesarios de EGGS
sudo rm /usr/share/applications/calamares.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-eggs.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-links-add.desktop

#Eliminar repositorio ubuntu y usuario=usuario
sudo rm /etc/apt/sources.list.d/focal.list
sudo apt-get update -y
sudo userdel usuario
sudo rm -r /home/usuario