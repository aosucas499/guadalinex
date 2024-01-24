#!/usr/bin/env python3

"""
This is a simple AppIndicator for Ubuntu used as an introduction to 
AppIndicators. 
"""

import os
import signal
import subprocess
from gi.repository import Gtk
from gi.repository import AppIndicator3
from gi.repository import Notify


APPINDICATOR_ID = "Switch autoupdate"
ENABLED_ICON_PATH = "/usr/share/icons/EducaAndOSIcons/apps/scalable/yast-online-update.svg"
DISABLED_ICON_PATH = "/usr/share/icons/EducaAndOSIcons/apps/scalable/AdobeUpdate.svg"
RUTA_DISABLE = "/usr/bin/disable-au"
RUTA_ENABLE = "/usr/bin/enable-au"

def main():
	indicator = AppIndicator3.Indicator.new(
			APPINDICATOR_ID,
			get_current_icon(),
			AppIndicator3.IndicatorCategory.SYSTEM_SERVICES)
	indicator.set_status(AppIndicator3.IndicatorStatus.ACTIVE)
	indicator.set_menu(menu_build(indicator))
	Notify.init(APPINDICATOR_ID)

	Gtk.main()


def menu_build(indicator):
    """Return a Gtk+ menu."""
    menu = Gtk.Menu()

    if os.path.exists("/usr/share/pyshared/cga-update-manager/upgrade_system.py"):
        # Construir el menú con "Desactivar auto-actualización" y "Quit"
        item_disable = Gtk.MenuItem("Desactivar auto-actualización")
        item_disable.connect('activate', lambda source, ind=indicator: disable_autoupdate(ind))
        menu.append(item_disable)
    else:
        # Construir el menú con "Activar auto-actualización" y "Quit"
        item_enable = Gtk.MenuItem("Activar auto-actualización")
        item_enable.connect('activate', lambda source, ind=indicator: enable_autoupdate(ind))
        menu.append(item_enable)

    item_quit = Gtk.MenuItem("Quit")
    item_quit.connect('activate', quit)
    menu.append(item_quit)

    menu.show_all()

    return menu


def enable_autoupdate(indicator):

	"""Activar CGA-Auto-Actualización"""

	update_icon(ENABLED_ICON_PATH, indicator)
	subprocess.run(["sudo", RUTA_ENABLE])
	menu = indicator.get_menu()
	menu.destroy()
	indicator.set_menu(menu_build(indicator))
	
	update_icon(ENABLED_ICON_PATH, indicator)
	
def disable_autoupdate(indicator):
	"""Desactivar CGA-Auto-Actualización"""
	
	update_icon(DISABLED_ICON_PATH, indicator)
	subprocess.run(["sudo", RUTA_DISABLE])
	menu = indicator.get_menu()
	menu.destroy()
	indicator.set_menu(menu_build(indicator))
    	
	update_icon(DISABLED_ICON_PATH, indicator)
	
def quit(source):
	Notify.uninit()
	Gtk.main_quit()
	
def update_icon(icon_path, indicator):
    indicator.set_icon_full(icon_path, "Switch autoupdate")

def get_current_icon():
    return ENABLED_ICON_PATH if os.path.exists("/usr/share/pyshared/cga-update-manager/upgrade_system.py") else DISABLED_ICON_PATH


if __name__ == "__main__":
	signal.signal(signal.SIGINT, signal.SIG_DFL)
	main()

