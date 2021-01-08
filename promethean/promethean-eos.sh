#!/bin/bash

KERNELVER=$(uname -r)

# Instalar drivers pizarra Promethean y programa activinspire en educaAndOs 20.04 (ubuntu focal based)

	#Repos Ubuntu focal
	sudo echo "deb [arch=amd64] http://archive.ubuntu.com/ubuntu/ focal main universe multiverse restricted" > focal.list
        sudo mv focal.list /etc/apt/sources.list.d/
	
	#Repos promethean
	sudo echo deb [arch=amd64] http://activsoftware.co.uk/linux/repos/driver/ubuntu bionic oss non-oss > promethean.list
        sudo echo deb [arch=amd64] http://activsoftware.co.uk/linux/repos/ubuntu bionic non-oss >> promethean.list
        sudo mv promethean.list /etc/apt/sources.list.d/
        #wget http://activsoftware.co.uk/linux/repos/driver/PrometheanLtd.asc
	sudo apt-key add PrometheanLtd.asc
	
	# Paquetes necesarios activdriver
	#wget http://security.ubuntu.com/ubuntu/pool/main/o/openssl1.0/libssl1.0.0_1.0.2n-1ubuntu5.4_amd64.deb
	sudo dpkg -i libssl1.0.0_1.0.2n-1ubuntu5.4_amd64.deb
	#wget http://security.ubuntu.com/ubuntu/pool/main/i/icu/libicu60_60.2-3ubuntu3.1_amd64.deb
	sudo dpkg -i libicu60_60.2-3ubuntu3.1_amd64.deb
	
	# Paquetes necesarios activinspire
	sudo apt-get update -y
	sudo apt-get install gsettings-ubuntu-schemas
	sudo dpkg -i ./curl34-focal/libcurl3*.deb
	sudo dpkg -i ./curl34-focal/libcurl4-doc*
	sudo dpkg -i ./curl34-focal/libcurl4_7*
	sudo dpkg -i ./curl34-focal/libcurl4-openssl*.deb
	sudo dpkg -i ./curl34-focal/curl*.deb
	
	#Instalación de activdriver
	sudo apt-get update -y
	sudo apt install activaid activdriver activtools -y
	sudo apt install --fix-broken -y
	sudo apt autoremove -y
	
	#Instalación de activinspire
	#wget http://centros.edu.guadalinex.org/Edu/fenixscpdi/pool/main/a/activinspire-licence/activinspire-licence_0.1-3_all.deb
	sudo dpkg -i activinspire-licence_0.1-3_all.deb
	sudo apt install activ-meta-es -y
	sudo dpkg -i promethean-fixboot_0.2_all.deb

	#Compilación del driver para kernels 5.x
	echo ""
 	echo "Modificación de Makefile para compatibilidad con kernels 5.*"
	echo ""
	cd /usr/src/promethean/kernel/
	sudo sed -i "s/SUBDIRS/M/g" /usr/src/promethean/kernel/Makefile
	sudo make -C /lib/modules/${KERNELVER}/build M=$PWD clean
	sudo cp /usr/src/linux-headers-${KERNELVER}/Module.symvers /usr/src/promethean/kernel
	sudo make -C /lib/modules/${KERNELVER}/build M=$PWD
	echo ""
	echo "Compilación de drivers"
	echo ""
	cd /usr/src/promethean/kernel/
	sudo ./b
  	
  	#Borrado de archivos
  	sudo rm -r /etc/apt/sources.list.d/promethean.list
  	sudo rm /etc/apt/sources.list.d/focal.list
	sudo apt-get update -y
	cd ~
	
	echo ""
	echo "Reinicie el PC o cierre sesión para que los drivers funcionen"
	notify-send "Reinicie el PC o cierre sesión para que los drivers funcionen"
	echo ""
