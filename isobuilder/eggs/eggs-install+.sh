#!/bin/bash 

# Instalar repo ubuntu y paquetes eggs
sudo rm /etc/apt/sources.list.d/focal.list
wget --no-check-certificate --content-disposition https://github.com/aosucas499/sources/raw/main/focal-sources.list
sudo mv focal-sources.list /etc/apt/sources.list.d/focal.list
sudo apt-get update -y 
sudo apt-get install git -y
sudo apt-get remove -y opera-stable
wget https://sourceforge.net/projects/penguins-eggs/files/packages-deb/eggs_7.8.39-1_amd64.deb
sudo dpkg -i eggs*.deb

# Modificar calamares 
sudo cp locale.yml /usr/lib/penguins-eggs/conf/distros/focal/calamares/modules/
sudo cp partition.yml /usr/lib/penguins-eggs/conf/distros/focal/calamares/modules/
sudo cp removeuser.yml /usr/lib/penguins-eggs/conf/distros/buster/calamares/modules/
sudo cp users.yml /usr/lib/penguins-eggs/conf/distros/focal/calamares/modules/

sudo cp install-debian.desktop /usr/lib/penguins-eggs/addons/eggs/theme/applications/
sudo cp show+.qml /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/show.qml
sudo cp slide+.png /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/welcome.png
sudo cp ../../imágenes/VirtualBox_guadalinex*20.png /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/slide1.png
sudo cp ../../imágenes/VirtualBox_guadalinex*20_3.png /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/slide1.png
sudo cp ../../imágenes/VirtualBox_guadalinex*20_4.png /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/slide2.png
sudo cp ../../imágenes/VirtualBox_guadalinex*20_5.png /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/slide3.png
sudo cp ../../imágenes/VirtualBox_guadalinex*20_9.png /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/slide4.png
sudo cp slide+.png /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/slide5.png
sudo cp ../../imágenes/VirtualBox_guadalinex*20.png /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/slide6.png
sudo cp ../../imágenes/VirtualBox_guadalinex*20_5.png /usr/lib/penguins-eggs/addons/eggs/theme/calamares/branding/slide7.png

# Seleccionar que no instalamos calamares aún
sudo eggs prerequisites

#cambiar fondo de pantalla
sudo cp educaandos_wallpaper-plus.png /usr/share/backgrounds/educaandos_wallpaper.png

#instalar apps-guadalinex-20 en el sistema
wget https://bit.ly/3tJuZ5R -O apps-educaandos
chmod +x apps-educaandos
./apps-educaandos

#copiar configuración para la ISO
sudo cp eggs.yaml /etc/penguins-eggs.d/
sudo cp exclude.list /usr/local/share/penguins-eggs/exclude.list

#instalar calamares
#sudo eggs calamares
sudo apt-get update -y
sudo eggs calamares --install

#Modificar grub del live ISO
sudo cp splash+.png /usr/lib/penguins-eggs/assets/penguins-eggs-splash.png
sudo cp theme+.cfg /usr/lib/penguins-eggs/conf/distros/buster/grub/theme.cfg
sudo cp menu.template+.cfg /usr/lib/penguins-eggs/conf/distros/focal/isolinux/menu.template.cfg

sudo cp splash+.png /usr/lib/penguins-eggs/addons/eggs/theme/livecd/splash.png
sudo cp theme+.cfg /usr/lib/penguins-eggs/addons/eggs/theme/livecd/theme.cfg
sudo cp menu.template+.cfg /usr/lib/penguins-eggs/addons/eggs/theme/livecd/menu.template.cfg

#eliminar archivos innecesarios de EGGS
sudo rm /usr/share/applications/calamares.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-eggs.desktop
sudo rm /usr/lib/penguins-eggs/assets/penguins-links-add.desktop

# paquetes necesarios para instalación en EFI
sudo apt-get install grub-efi-amd64-signed -y 
sudo apt-get install shim-signed -y

# crear iso y borrar iso
sudo eggs produce -vs
sudo eggs kill

#crear iso definitiva
sudo eggs produce -v

#Eliminar repositorio ubuntu
#hacerlo cuando ejecutamos el comando anterior y descarga lo necesario
#antes de que termine, para que copie el sistema sin los repos de ubuntu
sudo rm /etc/apt/sources.list.d/focal.list
sudo apt-get update -y



