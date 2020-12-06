#!/bin/bash

# =============================================================================
# Script para ejecutar en la iso y dar opción a añadir mejoras.
# =============================================================================

# -----------------------------------------------------------------------------
# Definición de las funciones utilizadas en el script
# -----------------------------------------------------------------------------
#
#
# Activa el autologin para el usuario "usuario"
# ---

function activarAutoLogin {

cat << EOF >> /etc/lightdm/lightdm.conf 

[Seat:*]
pam-service=lightdm
pam-autologin-service=lightdm-autologin
autologin-user=usuario
autologin-user-timeout=0
session-wrapper=/etc/X11/Xsession
greeter-session=lightdm-greeter

EOF

}


# Ejecuta la función correspondiente a cada una de las opciones del script
# ---

function ejecutarAccionOpcional {

    echo "Ejecutamos $1()"
    ($1)
}

# Activa el modo incógnito tanto en Firefox como en Chromium
# ---

function navegacionPrivada {

    # Modo incógnito en los Firefox del sistema
    # ---

    # En el Firefox de usuario/usuario
    sudo sed -i -e 's/firefox\/firefox/firefox --private-window/g' /home/usuario/.local/share/applications/firefox-noroot.desktop

    # En el firefox-esr del sistema (para todos los usuarios)
    sudo sed -i -e 's/firefox-esr %u/firefox-esr --private-window %u/g' /usr/share/applications/firefox-esr.desktop

    # Modo incógnito en Chromium
    # ---

    sudo sed -i -e 's/chromium %U/chromium --incognito %U/g' /usr/share/applications/chromium.desktop

}

# Invocamos ("callback") las funciones asociadas a las opciones 
# seleccionadas por el usuario
# ---

function procesarAccionesOpcionales {

    # Dividimos (el separador es "|" ) las opciones seleccionadas por el usuario
    # ---

    IFS="|" read -a vals <<< $1

    # Solicitamos (una a una) que se procesen dichas opciones

    for i in "${vals[@]}"
    do
        ejecutarAccionOpcional $i
    done

}

# -----------------------------------------------------------------------------
# Cuerpo del script
# -----------------------------------------------------------------------------

# Realizamos las opciones por defecto de nuestro script
# ---


# Permitimos seleccionar opciones personalizadas
# ---

# Mostramos las opciones personalizables

opc=$( \
    zenity \
        --list \
        --title="Elija las personalizaciones que desea apliar" \
        --checklist \
        --column="Aplicar" \
        --column="funcionAEjecutar" \
        --column="Descripción" \
        --hide-column=2 \
    True activarAutoLogin "Inicio de sesión automático" \
    True navegacionPrivada "Navegación web en modo incógnito por defecto" \
)

# Comprobamos que no se pulse el botón Cancelar

if [[ "$?" != 0 ]]; then
    echo "Sin problemas, ya personalizaremos Minino otro día ;)"
    exit 0
fi

# Procesamos las opciones elegidas por el usuario
# ---

procesarAccionesOpcionales $opc
