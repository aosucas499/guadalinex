import gi
import os
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk
import subprocess

class EntryWindow(Gtk.Window):
    def __init__(self):
        Gtk.Window.__init__(self, title="Herramienta de congelación de usuario")

        # Posicionamos la ventana en el centro de la pantalla
        self.set_position(Gtk.WindowPosition.CENTER)

        # Ajustamos la dimensión de la ventana
        self.set_border_width(20)
        self.set_default_size(400, 5)

        # Creamos primer contenedor de forma vertical que contiene info de la aplicación y la selección de radiobutton
        self.box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=15)

        label = Gtk.Label()
        label.set_markup(
            "Con esta aplicación podrá congelar el estado actual del usuario genérico del \n"
            "sistema (configuración visual, ficheros, todo de pantalla, etc.) y dicho estado \n"
            "será recuperado cada vez que el usuario genérico inicie una sesión. \n"
            "Tenga en cuenta que si la <b>congelación</b> se encuentra <b>activada</b> todos los cambios \n"
            "realizados en el directorio personal del usuario genérico <b>serán eliminados,</b> \n"
            "incluyendo <b>los ficheros que se hayan almacenado.</b>"
        )

        self.box.add(label)
        self.add(self.box)

        label = Gtk.Label(label="Seleccione la opción a aplicar:")
        self.box.add(label)
        self.add(self.box)

        self.radiobutton1 = Gtk.RadioButton(label="Congelar el estado del usuario genérico")
        self.radiobutton1.connect("toggled", self.on_radiobutton)
        self.box.pack_start(self.radiobutton1, True, True, 0)
        self.radiobutton2 = Gtk.RadioButton(label="Descongelar el estado del usuario genérico", group=self.radiobutton1)
        self.radiobutton2.connect("toggled", self.on_radiobutton)
        self.box.pack_start(self.radiobutton2, True, True, 0)

        # Creamos el segundo contenedor de forma horizontal que contendrá la clave
        self.box1 = Gtk.Box(spacing=10)
        self.box.add(self.box1)
        self.add(self.box)

        label = Gtk.Label(label="Clave de la aplicación: ")
        self.box1.add(label)

        self.clave = Gtk.Entry()
        self.clave.set_visibility(False)
        self.box1.add(self.clave)
        self.clave.connect("activate", self.on_enviar)

        # Creamos el tercer contenedor que contiene los botones de Ayuda, Aplicar y Cancelar
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

        # Segundo Grid con los botones Aplicar y Cancelar
        self.box3 = Gtk.Grid()
        self.box3.set_column_spacing(10)
        self.box2.add(self.box3)
        self.add(self.box2)
        self.box3.add(aplicar)
        self.box3.add(cancelar)

    # Función del botón Aplicar
    def on_enviar(self, widget):
        texto = self.clave.get_text()

        # Verificamos si la clave es "arcangel"
        if texto == "arcangel":
            print("contraseña correcta")
            # Aquí verificamos si está seleccionado el radiobutton de "Congelar"
            if self.radiobutton1.get_active():
                # Código para congelar el estado
                print("congelar")
                subprocess.run(["echo '#!/bin/sh -e\n#\n# rc.local\n#\n# This script is executed at the end of each multiuser runlevel.\n# value on error.\n#\n# In order to enable or disable this script just change the execution\n# bits.\n#\n# By default this script does nothing.' > /etc/rc.local"], shell=True)
                subprocess.run(['grep -v "exit 0" /etc/rc.local > /tmp/congelar.tmp'], shell=True)
                subprocess.run(['echo "sudo rsync -a --delete /etc/.congelador/usuario/ /home/usuario/" >> /tmp/congelar.tmp'], shell=True)
                subprocess.run(['echo "exit 0" >> /tmp/congelar.tmp'], shell=True)
                subprocess.run(['rm -f /etc/rc.local'], shell=True)
                subprocess.run(['cp /tmp/congelar.tmp /etc/rc.local'], shell=True)
                subprocess.run(['chmod 755 /etc/rc.local'], shell=True)
                subprocess.run(['rm -f /tmp/congelar.tmp'], shell=True)
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
                dialog.destroy()
                os.system("pkill -f rcLocalChecker.py")
                os.system("python /usr/share/cga-sistema-congelacion/rcLocalChecker.py &")

                self.radiobutton1.set_sensitive(False)
                self.radiobutton2.set_sensitive(True)
            else:
                # Código para descongelar el estado
                print("descongelar")
                subprocess.run(['grep -v "sudo rsync -a --delete /etc/" /etc/rc.local > /tmp/congelar.tmp'], shell=True)
                subprocess.run(['rm -f /etc/rc.local'], shell=True)
                subprocess.run(['cp /tmp/congelar.tmp /etc/rc.local'], shell=True)
                subprocess.run(['rm -f /tmp/congelar.tmp'], shell=True)
                subprocess.run(['rm -rf /etc/.congelador'], shell=True)

                dialog = Gtk.MessageDialog(
                    transient_for=self,
                    flags=0,
                    message_type=Gtk.MessageType.INFO,
                    buttons=Gtk.ButtonsType.OK,
                )
                dialog.set_title("Configuración aplicada")
                dialog.set_markup('\n' + "El equipo se ha descongelado correctamente" + '\n')
                dialog.run()
                dialog.destroy()
                os.system("pkill -f rcLocalChecker.py")
                os.system("python /usr/share/cga-sistema-congelacion/rcLocalChecker.py &")

                self.radiobutton2.set_sensitive(False)
                self.radiobutton1.set_sensitive(True)

        else:
            # Si la contraseña es incorrecta
            print("contraseña incorrecta")
            dialog = Gtk.MessageDialog(
                transient_for=self,
                flags=0,
                message_type=Gtk.MessageType.ERROR,
                buttons=Gtk.ButtonsType.OK,
            )
            dialog.set_title("Error al aplicar la configuración")
            dialog.set_markup('\n' + " <span foreground='red'>Error: </span> La clave de la aplicación no es correcta" + '\n')
            dialog.run()
            dialog.destroy()

    # Función para el botón Ayuda
    def on_info_clicked(self, widget):
        dialog = Gtk.MessageDialog(
            transient_for=self,
            flags=0,
            message_type=Gtk.MessageType.QUESTION,
            buttons=Gtk.ButtonsType.OK,
            text="Ayuda",
        )
        dialog.format_secondary_text(
            "Esta aplicación ya no requiere del servidor de centro.\n"
            "La contraseña es la misma que se utiliza para acceder al servidor de Gesuser.\n"
            "Para obtener estos datos puede consultarlos en el canal Coordinación TDE Andalucía de Telegram  ."
        )
        dialog.run()
        dialog.destroy()

    # Función para el botón Cancelar
    def on_cancelar(self, widget):
        print("Aplicación cerrada")
        Gtk.main_quit()

    def on_radiobutton(self, radiobutton):
        if radiobutton.get_active() == True:
            label = "Congelar el estado del usuario genérico"
            if radiobutton.get_label() == label:
                print("Congelar")
            else:
                print("Descongelar")

win = EntryWindow()
win.connect("destroy", Gtk.main_quit)
win.show_all()
Gtk.main()

