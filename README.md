# EducaAndOS
Scripts y aplicaciones para aplicar en EducaAndOS.

## ISO - versión no oficial 

Enlace: [link](https://bit.ly/2WZXspB)

Instrucciones: [wiki](https://github.com/aosucas499/guadalinex/wiki/Instrucciones)

Thanks to pieroproietti (https://github.com/pieroproietti/penguins-eggs) for his amazing tool "penguin eggs" to generate the ISO and the installer calamares.


# Scripts para generar el sistema


## update-guadalinex-20

Actualiza guadalinex 20.04 a educaandos. Es el que deja el sistema más parecido al sistem oficial.

ISO: https://bit.ly/30TJxDV

  ### USO
  
    sudo apt update -y

    sudo apt install git

    cd ~ 

    git clone https://github.com/aosucas499/guadalinex.git

    cd guadalinex
    
    chmod +x update-guadalinex-20 `

    sudo ./update-guadalinex-20


## ubuntuminimal

Genera el sistema EducaAndOS a partir de una imagen mínima de Ubuntu Focal 20. Tiene la ventaja de que los paquetes de Ubuntu (firefox, libreoffice...) siempre van a estar más actualizados que los que trae EducaAndOs.

ISO: http://archive.ubuntu.com/ubuntu/dists/focal/main/installer-amd64/current/legacy-images/netboot/mini.iso

   ### USO
   
    sudo apt update -y

    sudo apt install git

    cd ~ 

    git clone https://github.com/aosucas499/guadalinex.git

    cd guadalinex
    
    chmod +x ubuntuminimal

    sudo ./ubuntuminimal


## ubuntudesktop

Genera el sistema educaandos a partir de una imagen desktop de Ubuntu Focal 20.

ISO: https://releases.ubuntu.com/20.04/ubuntu-20.04.1-desktop-amd64.iso

   ### USO
   
    sudo apt update -y

    sudo apt install git

    cd ~ 

    git clone https://github.com/aosucas499/guadalinex.git

    cd guadalinex
    
    chmod +x ubuntudesktop

    sudo ./ubuntudesktop


## apps-guadalinex-20

Script para instalar en EducaAndOS: repositorios Ubuntu 20.04, apagado automático, docker...

  ### USO
  
    sudo apt update -y

    sudo apt install git

    cd ~ 

    git clone https://github.com/aosucas499/guadalinex.git

    cd guadalinex
    
    chmod +x apps-guadalinex-20

    ./apps-guadalinex-20
