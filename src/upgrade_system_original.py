#!/usr/bin/python3
# -*- coding:utf-8 -*-

#import gobject

import aptdaemon.client
import os
import logging.config
import logging
import apt_pkg
import subprocess
import sys
import urllib
#import #gtk
import time
from aptdaemon.errors import TransactionFailed
from UpdateManager.Core.UpdateList import UpdateList
from UpdateManager.Core.MyCache  import MyCache
from UpdateManager.Core.utils import humanize_size 
from user_interface.icon import Animated_system_icon, Status_icon, UPDATING_ICON_ARRAY, FINISHED_ICON_ARRAY
from user_interface.notify import Notification, Notifier
from user_interface.icon import ICON_UPDATE, ICON_ERROR, ICON_OK, ICON_WARNING, ICON_GTG_PANEL, ICON_APPORT
from user_interface.system import System_handler
from config_manager import Config_manager
from gi.repository import GObject, Gtk

MINIMUN_BATTERY_PERCENT=30 # Valor mínimo de la batería antes de intentar actualizarse.
NOTIFICATION_TITLE="Actualizaciones de educaAndOS"
LOW_BATTERY='La batería está por debajo del mínimo de carga segura, conecte su equipo a la corriente eléctrica.'
CHECK_CONNECTION='No se detecta conexión de red, verifique que la conexión a internet de su equipo es correcta.'


def configure_logging():
   logfile = "/usr/share/pyshared/cga-update-manager/log.cfg"
   try:
      f = open(logfile, "r")
   except Exception as error:
      print("Imposible abrir el archivo de configuración de log %s: \n %s" % (logfile, error))
      sys.exit(1)
   logging.config.fileConfig(logfile)



class Upgrade(): 
   
   def __init__(self):
      self.system = System_handler()
      self.loop = GObject.MainLoop()
      self.apt_client = aptdaemon.client.AptClient()
      self.cfg = Config_manager("/usr/share/pyshared/cga-update-manager/update.cfg")
      self.notifier = Notifier()
      self.icon = Animated_system_icon(self.cfg.get_icons_path())
      self.icon.set_refresh_rate(250)
      self.icon.set_animated_images_array(UPDATING_ICON_ARRAY)
      self.icon.start_animation()
      self.__trans_dict = {}
      self.resume_error = False
      
      
      
      class ProtoParent:
         def __init__(self):
            pass
         def error(self, error_string):
            logging.error(error_string)
            
      self.proto_p = ProtoParent()
      
      
   ## Lanza la notificación si no hay red
   #  
   def notification_check_connection(self):
      n1 = Notification(NOTIFICATION_TITLE, CHECK_CONNECTION, self.cfg.get_icons_path(), ICON_WARNING)
      result = self.notifier.show_notification(n1)


   ## Lanza la notificación nivel de bateria
   #  
   def notification_battery(self):
      n1 = Notification(NOTIFICATION_TITLE, LOW_BATTERY, self.cfg.get_icons_path(), ICON_WARNING)
      result = self.notifier.show_notification(n1)
      
      
   ## Comprueba si el equipo está funcionando con cargador o batería
   #
   def check_battery_status(self):
      
      if (self.system.battery_available()==False):
         # Si no está usando la batería pero estamos conectados al equipo
         # solo puede deberse a que está conectado con el transformador.
         logging.info("El sistema está funcionando con el cargador")
         return True
      else:
         # Si detecta la batería, necesitamos asegurarnos de que tenga carga
         # suficiente para un hipotético proceso de actualización.
         if (self.system.get_charge_percent()>=MINIMUN_BATTERY_PERCENT):
            logging.info("La batería está por encima del 30%, es seguro actualizar")
            return True
         else:
            n1 = Notification( NOTIFICATION_TITLE, LOW_BATTERY, self.cfg.get_icons_path(), ICON_WARNING)
            result = self.notifier.show_notification(n1)
            logging.info("La batería está funcionando por debajo del mínimo de carga segura.")
            return False
            if not result:
               logging.info("No se lanza notification")
               

   ## Proceso de simulación
   # @param error_handler:  manejador para asignar al evento de status-changed 
   def repair_system(self, error_handler):
      try:
         t_fix_incomplete_1 = self.apt_client.fix_incomplete_install()
         t_fix_incomplete_1.connect( "status-changed",
                                     self.__status_changed_handler )
         t_fix_incomplete_1.connect( "finished",
                                     self.__finished )
         t_fix_broken = self.apt_client.fix_broken_depends()
         t_fix_broken.connect( "finished",
                                     self.__finished )
         t_fix_broken.run_after( t_fix_incomplete_1,
                                 reply_handler=self.success_handler,
                                 error_handler=error_handler)
         t_fix_incomplete_2 = self.apt_client.fix_incomplete_install()
         t_fix_incomplete_2.connect( "finished",
                                     self.__finished )
         t_fix_incomplete_2.run_after(t_fix_broken,
                                      reply_handler=self.success_handler,
                                      error_handler=error_handler)
         t_fix_incomplete_1.run(reply_handler=self.success_handler,
                                 error_handler=error_handler)
      except TransactionFailed:
         #FIXME: controlar la excepción con el manejador de error 
         #except TransactionFailed as e:
         error_handler()
         logging.error( "Error en el run de la transaccion")
         
   ## Señal para obtener los diferentes estados de la transacción
   # @param sender: transacción
   # @param status: estado de la transacción       
   def __status_changed_handler(self, sender, status):
      logging.debug( "Estado de %s: %s" %(repr(sender), status))
      if status == "status-authenticating":
         self.icon.show_icon()
         self.icon.set_message("Ejecutando tareas de reparación")
   
   ## Señal para saber si la transacción ha terminado correctamente o no.
   # @param sender: transacción
   # @param status_finished: estado de la transacción
   def __finished(self, sender, status_finished):
      logging.info("Estado de %s: %s" %(repr(sender), status_finished))
      if status_finished == "exit-success":
         logging.info("La reparación ha terminado correctamente.")
      else:
         logging.info("La reparación ha fallado.")
         
   ## Método que descarga un archivo y lo ejecuta.
   # @param url: ruta del servidor f0
   # @param path: ruta local del archivo
   def ejecutar_script(self, url, path):
      logging.debug("Se ejecuta el script con url: %s y path: %s" %(url, path))
      retcode = subprocess.call(["sudo", "/usr/share/cga-update-manager/cga-fix.sh",url,path])
      logging.debug("Al intentar ejecutar el script fix devuelve %s" %retcode)
 
 
   ## Método que actualiza la cache y nos devuelve el peso y el número de 
   #  paquetes.
   # @param error_handler: manejador por si falla.
   def check_updates(self, error_handler):
      self.__update_trans = self.apt_client.update_cache(wait=True)
      self.cache = MyCache(progress=None)
      self.cache.open()
      self.cache.upgrade(True)
      ul = UpdateList(self.proto_p)
      ul.update(self.cache)
      logging.debug("Hay %s paquetes para actualizar" %ul.num_updates)
     
      
      self.packages_list=[]
      for pkg in self.cache:
          if pkg.is_upgradable or pkg.marked_install:
              if getattr(pkg.candidate, "origins", None) is None:
                  continue
              self.packages_list.append(pkg)
 
      # los paquetes se orgnaizan en un diccionario:
      #  clave: origen
      #  valor: lista de Package
      #update_origins = ul.pkgs
      #for origin in update_origins.keys():
      #   for package in update_origins.get(origin):
      #      self.packages_list.append(package)
      #self.packages_list=ul.held_back
      download_human_size = humanize_size(self.cache.required_download) 
      
      logging.debug("Paquetes a actualizar: %s" %(repr(self.packages_list)))
      logging.debug( "Tamaño de la actualización: %s" 
                     %(download_human_size))
      
      return [ul.num_updates, download_human_size]
   
      
   ## Proceso de instalación
   #
   def do_install_packages(self):      
      self.__upgrade_trans = self.apt_client.upgrade_system(safe_mode=False, wait=False)
      #permitimos paquetes sin firmar
      self.__upgrade_trans.set_allow_unauthenticated(True)
      self.__upgrade_trans.connect( "finished", self.__finished_install)
      self.__upgrade_trans.connect( "progress-changed", self.__progress_changed_handler)
      self.__upgrade_trans.connect( "error", self.__error_handler)
      self.__upgrade_trans.connect( "status-changed", self.__status_changed_install)


      self.__upgrade_trans.run( reply_handler = self.success_do_install, 
                                      error_handler = self.error_do_install)
      
      
   ## Señal para saber si la transacción ha terminado correctamente o no.
   # @param sender: transacción
   # @param status_finished: estado de la transacción  
   def __finished_install(self, sender, status_finished):
      logging.info("La instalación ha terminado con estado: %s"%status_finished)
      tittle = "Actualizaciones de educaAndOS"
      
      if status_finished == "exit-success":
         logging.info("La actualización ha terminado correctamente")
         icon = ICON_OK
         message = "La actualización ha terminado correctamente"
         icon_finished = ICON_GTG_PANEL
         self.resume_error = False
      else:
         logging.info("La actualización ha fallado.")
         icon = ICON_WARNING
         message = "La actualización ha terminado"
         icon_finished = ICON_APPORT
         self.resume_error = True
         
      n1 = Notification( tittle, message,self.cfg.get_icons_path(), icon)
      result = self.notifier.show_notification( n1)
      if not result:
         logging.error( "No se lanza la notificación")
      #FINISHED_ICON_ARRAY.append(self.cfg.get_icons_path()+icon_finished)
      FINISHED_ICON_ARRAY.append(icon_finished)
      self.icon.set_animated_images_array(FINISHED_ICON_ARRAY)
      self.icon.start_animation()
      self.icon.set_message("El proceso de actualización ha finalizado")
      self.icon.show_resume_entry(self.resume_error)
      self.icon.show_exit_entry()
      
   
   ## Señal para obtener el progreso de la actualización.
   # @param sender: transacción
   # @param progress: % de la actualización
   def __progress_changed_handler(self, sender, progress):
      logging.info("Progreso cambia a: %s" %progress)
      self.icon.set_message("Proceso de actualización al "+str(progress)+"%")
      logging.debug( "Actualizado %s" %progress)


   ## Señal de error de la transacción.
   # @param sender: transacción
   # @param error_code: código de error
   # @param error_details: detalles del error 
   def __error_handler(self, sender, error_code, error_details):
      #TODO: ¿Cual debería ser su comportamiento?
      self.details_error = error_details
      logging.error("Ha ocurrido un error. Codigo: %s, DESCRIPCION: %s" %(error_code, error_details))


   ## Señal para obtener los diferentes estados de la transacción.
   #Resuelve el problema de paquetes que deben actualizar archivos en la carpeta /etc/ 
   # @param trans: transacción
   # @param status: estado de la transacción 
   def __status_changed_install(self, trans, status):
      logging.debug( "Transaccion en  %s" %(status))
      if status == 'status-waiting-config-file-prompt':
         trans.resolve_config_file_conflict( trans.config_file_conflict[0], 
                                             'replace')
         
         
   ## Método error para las transacciones de reparación.
   # @param arg*: argumentos del error 
   def error_proc_repair(self, *args):
      logging.info("Se ha producido un error.")
      logging.error(args)


   ## Método success para las transacciones de reparación.
   # 
   def success_handler(self):
      logging.debug("Transacción emitida correctamente")


   ## Método success para las transacción de instalación.
   #
   def success_do_install(self):
      logging.info("Se ha iniciado la transacción correctamente.")
      logging.debug("Configurando...")
      
      
   ## Método error para las transacción de instalación.
   # @param arg*: argumentos del error   
   def error_do_install(self, *args):
      logging.info("Se ha producido un error.")
      logging.error(args)
      
   
   ## Método error para las transacción de simulación.
   # @param arg*: argumentos del error
   def error_simulate(self, *args):
      logging.info("Se ha producido un error.")
      logging.error(args)  
      
      
   ## Método que lanza las diferentes notificaciones y el icono correspondiente 
   #  según el número de paquetes. 
   #Si devuelve True se lleva a cabo la actualización.
   #Si devuelve False no se lleva a cabo la actualización.
   # @param num_updates: número de paquetes a actualizar
   # @param download_human_size: peso de la actualización 
   def get_updates_availables(self, num_updates, download_human_size):
      tittle = "Actualizaciones de educaAndOS"
      if num_updates > 0:
         if num_updates == 1:
            if download_human_size == "0 kB":
               message = "Hay %s actualización"  %(num_updates)
            else:
               message = "Hay %s actualización. Se van a descargar %s"  %(num_updates, 
                                                                      download_human_size)
         elif num_updates > 1:
            if download_human_size == "0 kB":
               message = "Hay %s actualizaciones"  %(num_updates)
            else:   
               message = "Hay %s actualizaciones. Se van a descargar %s"  %(num_updates, 
                                                                      download_human_size)
         n1 = Notification( tittle, message,self.cfg.get_icons_path(), ICON_UPDATE) 
         result = self.notifier.show_notification( n1)
         return True
      else:
         logging.info("No hay actualizaciones pendientes")
         #FINISHED_ICON_ARRAY.append(self.cfg.get_icons_path()+ICON_GTG_PANEL)
         FINISHED_ICON_ARRAY.append(ICON_GTG_PANEL)
         self.icon.set_animated_images_array(FINISHED_ICON_ARRAY)
         #FIXME: Poner imagen fija 
         self.icon.set_refresh_rate(5000)
         self.icon.start_animation()
         self.icon.set_message("Su equipo se encuentra actualizado")
         self.icon.show_exit_entry()
         return False
      
      
   ## Método que crea la ventana con la lista de paquetes que se han actualizado.
   #Devuelve la ventana.
   # @param packages_names: lista de nombres de paquetes actualizados
   def inicialize_details_window(self, details, boolean):
      if boolean == False:
         label = Gtk.Label("Lista de paquetes instalados:")
      else:
         label = Gtk.Label("Resumen del proceso de actualización:")
      self.icon.set_sensitive(False)
      self.window = Gtk.Window(Gtk.WindowType.TOPLEVEL)
      self.window.set_wmclass("Sistema de actualización", "Sistema de actualización")
      self.window.set_default_icon_name('system-software-update')
      box = Gtk.VBox(False, 0)
      hbox = Gtk.HBox(True, 5)
      frame = Gtk.Frame()
      scrolledwindow = Gtk.ScrolledWindow()
      textview = Gtk.TextView()
      textbuffer = Gtk.TextBuffer()
      button = Gtk.Button()
      alignment = Gtk.Alignment()
      separator = Gtk.HSeparator()
      
      self.window.set_size_request(400, 400)
      self.window.set_border_width(10)
      self.window.set_position(Gtk.WindowPosition.CENTER)
      self.window.set_title("Sistema de actualización")
      self.window.set_modal(True)
      self.window.connect("destroy", self.hide_window)
      
      textbuffer.set_text(details)
      textview.set_buffer(textbuffer)
      textview.set_editable(False)
      textview.set_cursor_visible(False)
      
      button.set_label("Aceptar")
      button.connect("clicked", self.hide_window)
      
#      scrolledwindow.set_policy(gtk.POLICY_AUTOMATIC, gtk.POLICY_AUTOMATIC)
      
#      frame.set_shadow_type(gtk.SHADOW_NONE)
      label.set_use_markup(True)
      frame.set_label_widget(label)
      
      alignment.set_padding(25, 0, 12, 0)
      alignment.set(0.5, 0.5, 1.0, 1.0)
      
      frame.add(alignment)
      scrolledwindow.add(textview)
      alignment.add(scrolledwindow)
      box.pack_start(frame, True, True, 0)
      box.pack_start(separator, False, True, 10)
      hbox.pack_start(button, False, False, 0)
      box.pack_start(hbox, False, False, 0)
      self.window.add(box)
      self.window.show_all()
      return self.window
   
   
   ## Método que oculta la ventana y activa en el menú "Mostrar resumen".
   #
   def hide_window(self, widget, data=None):
      self.window.hide()
      self.icon.set_sensitive(True)
   
   ## Método que crea la lista con los nombres de los paquetes actualizados.
   # @param packages_list: lista con los nombres de los paquetes actualizados.
   # Devuelve la lista de los nombres de los paquetes con saltos de líneas. 
   def get_packages_names_str(self, packages_list):
      result = ""
      for package in packages_list:
         result += package.name+ "\n"
      return result[:-1]

   
   ## Método que muestra los detalles de la ventana.
   #APPLICATION_STATUS) 
   def show_details_window(self, widget=None, data=None):
      if self.resume_error == False:
         self.packages_names = self.get_packages_names_str(self.packages_list)
         self.ventana = self.inicialize_details_window(self.packages_names, False)
      else:
         self.ventana = self.inicialize_details_window(self.details_error, True)
      self.ventana.show()

        
def main():
   configure_logging()
   up = Upgrade()
   if up.system.check_connection() == False:
      up.notification_check_connection()
   while up.system.check_connection() == False:
      time.sleep(300)
   up.repair_system(up.error_proc_repair)
   if up.check_battery_status() == False:
      up.notification_battery()
   while up.check_battery_status() == False:
      time.sleep(300)
   up.ejecutar_script(up.cfg.get_fix_script_url(), 
                      up.cfg.get_fix_path())
   [num_updates, download_human_size] = up.check_updates(up.error_simulate)
   updates_availables = up.get_updates_availables(num_updates, download_human_size)
   if updates_availables == True:
      up.do_install_packages()
      up.icon.set_on_packages_info_clic_handler(up.show_details_window)
   Gtk.main()
      
if __name__ == "__main__":
   os.nice(19)
   subprocess.call(["ionice","-c3", "-p",str(os.getpid())])
   #try:
   main()
   #except Exception as e:
   #   logging.critical("Error no controlado: %s" %(repr(e)))
   #   sys.exit(1)
   #TODO: hacer salida limpia
   logging.info("El programa finaliza bien: sys.exit(0)")
   sys.exit(0)
