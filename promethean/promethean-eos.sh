# Instalar drivers pizarra Promethean y programa activinspire en educaAndOs 20.04 (ubuntu focal based)

	#Repos promethean
	#sudo echo deb [arch=amd64] http://activsoftware.co.uk/linux/repos/driver/ubuntu bionic oss non-oss > promethean.list
        #sudo echo deb [arch=amd64] http://activsoftware.co.uk/linux/repos/ubuntu bionic non-oss >> promethean.list
        #sudo mv promethean.list /etc/apt/sources.list.d/
        #wget http://activsoftware.co.uk/linux/repos/driver/PrometheanLtd.asc
	#sudo apt-key add PrometheanLtd.asc
	
	# Paquetes necesarios
	#wget http://security.ubuntu.com/ubuntu/pool/main/o/openssl1.0/libssl1.0.0_1.0.2n-1ubuntu5.4_amd64.deb
	#sudo dpkg -i libssl1.0.0_1.0.2n-1ubuntu5.4_amd64.deb
	#wget http://security.ubuntu.com/ubuntu/pool/main/i/icu/libicu60_60.2-3ubuntu3.1_amd64.deb
	#sudo dpkg -i libicu60_60.2-3ubuntu3.1_amd64.deb
	#sudo apt-get update -y
	#sudo apt-get install gsettings-ubuntu-schemas
	sudo dpkg -i ./curl34-focal/libcurl3*.deb
	sudo dpkg -i ./curl34-focal/libcurl4-doc*
	sudo dpkg -i ./curl34-focal/libcurl4-gnutls*
	sudo dpkg -i ./curl34-focal/libcurl4*.deb
	sudo dpkg -i ./curl34-focal/libcurl4*.deb
	sudo dpkg -i ./curl34-focal/libcurl4*.deb
	sudo dpkg -i ./curl34-focal/curl*.deb
	
	
	#Instalación de activdriver y activinspire
	#sudo apt-get update -y
	#sudo apt install activdriver activtools -y
	#sudo apt install activ-meta-es -y
	#wget http://centros.edu.guadalinex.org/Edu/fenixscpdi/pool/main/a/activinspire-licence/activinspire-licence_0.1-3_all.deb
	#sudo dpkg -i activinspire-licence_0.1-3_all.deb

	#Compilación del driver para kernels 5.x
	#kernelversion=$(uname -r | awk -F. '{ print $1}')
	#if ["$kernelversion" == "5" ]; then
  	#echo "Modification du Makefile des drivers pour compatibilité avec kernels 5.*"
  	
  	#Borrado de archivos
  	#sudo rm -r /etc/apt/sources.list.d/promethean.list
