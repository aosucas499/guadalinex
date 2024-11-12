import gi
import os
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib
import requests
import json
import hashlib
import subprocess


class EntryWindow(Gtk.Window):
    def __init__(self):
        Gtk.Window.__init__(self, title="Herramienta de congelación de usuario")

	#Posicionamos la ventana en el centro de la pantalla
        self.set_position(Gtk.WindowPosition.CENTER)

        #Ajustamos la dimension de la ventana
        self.set_border_width(20)
        self.set_default_size(400,5)

        #Creamos primer contenedor de forma vertical que contiene info de la aplicacion y la seleccion de radiobutton
        self.box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=15)

        label = Gtk.Label()
        label.set_markup("Con esta aplicación podrá congelar el estado actual del usuario genérico del \n"
                  "sistema (configuración visual, ficheros, todo de pantalla, etc.) y dicho estado \n"
                  "será recuperado cada vez que el usuario genérico inicie una sesión. \n"
                  "Tenga en cuenta que si la <b>congelación</b> se encuentra <b>activada</b> todos los cambios \n"
                  "realizados en el directorio personal del usuario genérico <b>serán eliminados,</b> \n"
                  "incluyendo <b>los ficheros que se hayan almacenado.</b>"
        )

        self.box.add(label)
        self.add(self.box)

        label = Gtk.Label(
            label=("Seleccione la opción a aplicar:")
            )

        self.box.add(label)
        self.add(self.box)

        self.radiobutton1 = Gtk.RadioButton(label="Congelar el estado del usuario genérico")
        self.radiobutton1.connect("toggled", self.on_radiobutton)
        self.box.pack_start(self.radiobutton1, True, True, 0)
        self.radiobutton2 = Gtk.RadioButton(label="Descongelar el estado del usuario genérico", group=self.radiobutton1)
        self.radiobutton2.connect("toggled", self.on_radiobutton)
        self.box.pack_start(self.radiobutton2, True, True, 0)

        #Creamos el tercer contenedor que contendra dos Grid con los botones de Ayuda, Aplicar y Cancelar
        #Primer Grid que contiene el primer botón Ayuda
        self.box2 = Gtk.Grid()
        self.box2.set_column_spacing(300)
        self.box.add(self.box2)
        self.add(self.box)

        ayuda = Gtk.Button(label="Ayuda")
        ayuda.connect("clicked", self.on_info_clicked)

        aplicar = Gtk.Button(label="Aplicar")
        aplicar.connect("clicked", self.on_enviar)

        cancelar = Gtk.Button(label="Cancelar")
        cancelar.connect("clicked", self.on_cancelar)

        self.box2.add(ayuda)

        #Segundo Grid con los botones Aplicar y Cancelar
        self.box3 = Gtk.Grid()
        self.box3.set_column_spacing(10)
        self.box2.add(self.box3)
        self.add(self.box2)
        self.box3.add(aplicar)
        self.box3.add(cancelar)

    #Funcion del boton Aplicar
    def on_enviar(self, widget):
        
            print("contraseña correcta")
            if self.radiobutton1.get_active() == True:
              print("congelar")
              subprocess.run(["echo '#!/bin/sh -e\n#\n# rc.local\n#\n# This script is executed at the end of each multiuser runlevel.\n# value on error.\n#\n# In order to enable or disable this script just change the execution\n# bits.\n#\n# By default this script does nothing.' > /etc/rc.local"], shell=True)
              # 1.- Vuelca todas las lineas del fichero a un fichero temporal menos la linea "exit 0"
              subprocess.run(['grep -v "exit 0" /etc/rc.local > /tmp/congelar.tmp'], shell=True)
              # 2.- Incluye la linea de sincronización al fichero temporal
              subprocess.run(['echo "sudo rsync -a --delete /etc/.congelador/usuario/ /home/usuario/" >> /tmp/congelar.tmp'], shell=True)
              # 3.- Incluye exit 0 al fichero temporal
              subprocess.run(['echo "exit 0" >> /tmp/congelar.tmp'], shell=True)
              # 4.- Copia el fichero temporal en el fichero definitivo y borra el fichero temporal
              subprocess.run(['rm -f /etc/rc.local'], shell=True)
              subprocess.run(['cp /tmp/congelar.tmp /etc/rc.local'], shell=True)
              subprocess.run(['chmod 755 /etc/rc.local'], shell=True)
              subprocess.run(['rm -f /tmp/congelar.tmp'], shell=True)
              # Hace una copia actual del directorio personal del usuario por defecto que quedara congelado en ese momento
              subprocess.run(['rsync -a --delete /home/usuario /etc/.congelador/'], shell=True)

              dialog = Gtk.MessageDialog(
              transient_for=self,
              flags=0,
              message_type=Gtk.MessageType.INFO,
              buttons=Gtk.ButtonsType.OK,
              )
              dialog.set_title("Configuración aplicada")
              dialog.set_markup('\n' + "El equipo se ha congelado correctamente" + '\n')
              dialog.run()
              print("APLICADO dialog closed")

              dialog.destroy()
              os.system("pkill -f rcLocalChecker.py")
              os.system("python /usr/share/cga-sistema-congelacion/rcLocalChecker.py &")


              self.radiobutton1.set_sensitive(False)
              self.radiobutton2.set_sensitive(True)
            else:
              print("descongelar")
              # Elimina el comando que restaura los datos congelados del usuario por defecto
              subprocess.run(['grep -v "sudo rsync -a --delete /etc/" /etc/rc.local > /tmp/congelar.tmp'], shell=True)
              subprocess.run(['rm -f /etc/rc.local'], shell=True)
              subprocess.run(['cp /tmp/congelar.tmp /etc/rc.local'], shell=True)
              subprocess.run(['rm -f /tmp/congelar.tmp'], shell=True)
              # Elimina los datos congelados del usuario por defecto
              subprocess.run(['rm -rf /etc/.congelador'], shell=True)

              dialog = Gtk.MessageDialog(
              transient_for=self,
              flags=0,
              message_type=Gtk.MessageType.INFO,
              buttons=Gtk.ButtonsType.OK,
              )
              dialog.set_title("Configuración aplicada")
              dialog.set_markup('\n' + "El equipo se ha descongelaco correctamente" + '\n')
              dialog.run()
              print("APLICADO dialog closed")

              dialog.destroy()
              os.system("pkill -f rcLocalChecker.py")
              os.system("python /usr/share/cga-sistema-congelacion/rcLocalChecker.py &")


              self.radiobutton2.set_sensitive(False)
              self.radiobutton1.set_sensitive(True)

          

    #Funcion para el boton Ayuda
    def on_info_clicked(self, widget):
        dialog = Gtk.MessageDialog(
            transient_for=self,
            flags=0,
            message_type=Gtk.MessageType.QUESTION,
            buttons=Gtk.ButtonsType.OK,
            text="Ayuda",
        )
        dialog.format_secondary_text(
            "Esta aplicación requiere para su funcionamiento de la herramienta Gesuser instalada en el servidor de contenidos del Centro Educativo.\n"
            "Es necesario activar en Gesuser esta funcionalidad y generar la clave de activación.\n"
            "Para obtener estos datos tendrá que consutarlo a la persona responsable de gestionar la herramienta Gesuser en su Centro Educativo."
        )
        dialog.run()
        print("AYUDA cerrado correctamente")

        dialog.destroy()

    #Funcion para el boton Cancelar
    def on_cancelar(self, widget):
      print("Aplicación cerrada")
      Gtk.main_quit()

    def on_radiobutton(self, radiobutton):
        if radiobutton.get_active() == True:
          label= "Congelar el estado del usuario genérico"
          if radiobutton.get_label() == label:
            print("Congelar")
          else:
            print("Descongelar")


win = EntryWindow()
win.connect("destroy", Gtk.main_quit)
win.show_all()
Gtk.main()
