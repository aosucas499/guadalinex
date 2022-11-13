/**
 * penguins-eggs: ovary.ts
 * author: Piero Proietti
 * mail: piero.proietti@gmail.com
 *
 */

// packages
import fs, { Dir, Dirent } from 'fs'
import path from 'node:path'
import os from 'node:os'
import shx from 'shelljs'
import chalk from 'chalk'
import mustache from 'mustache'
import PveLive from './pve-live'

// interfaces
import { IMyAddons } from '../interfaces'

// libraries
import { exec } from '../lib/utils'

// classes
import Utils from './utils'
import N8 from './n8'
import Incubator from './incubation/incubator'
import Xdg from './xdg'
import Pacman from './pacman'
import Settings from './settings'
import Systemctl from './systemctl'
import Bleach from './bleach'
import Repo from './yolk'
import cliAutologin = require('../lib/cli-autologin')
import { displaymanager } from './incubation/fisherman-helper/displaymanager'

// backup
import { access } from 'fs/promises'
import { constants } from 'fs'
import Users from './users'

/**
 * Ovary:
 */
export default class Ovary {
  verbose = false

  echo = {}

  toNull = ''

  incubator = {} as Incubator

  settings = {} as Settings

  familyId = ''

  snapshot_prefix = ''

  snapshot_basename = ''

  compression = ''

  clone = false

  /**
   * @returns {boolean} success
   */
  async fertilization(snapshot_prefix = '', snapshot_basename = '', theme = '', compression = ''): Promise<boolean> {
    this.settings = new Settings()

    if (await this.settings.load()) {

      this.familyId = this.settings.distro.familyId

      if (snapshot_prefix !== '') {
        this.settings.config.snapshot_prefix = snapshot_prefix
      }

      if (snapshot_basename !== '') {
        this.settings.config.snapshot_basename = snapshot_basename
      }

      if (theme !== '') {
        this.settings.config.theme = theme
      }

      if (compression !== '') {
        this.settings.config.compression = compression
      }

      this.settings.listFreeSpace()
      if (await Utils.customConfirm('Select yes to continue...')) {
        return true
      }
    }
    return false
  }

  /**
   *
   * @param basename
   */
  async produce(backup = false, clone = false, scriptOnly = false, yolkRenew = false, release = false, myAddons: IMyAddons, verbose = false) {
    this.verbose = verbose
    this.clone = clone
    this.echo = Utils.setEcho(verbose)
    if (this.verbose) {
      this.toNull = ' > /dev/null 2>&1'
    }

    let luksName = 'luks-eggs-backup'
    let luksFile = `/tmp/${luksName}`

    if (this.familyId === 'debian') {
      const yolk = new Repo()
      if (!yolk.yolkExists()) {
        Utils.warning('local repository /var/local/yolk creation...')
        await yolk.create(verbose)
      } else if (yolkRenew) {
        Utils.warning('force renew local repository /var/local/yolk...')
        yolk.yolkClean()
        await yolk.create(verbose)
      } else {
        Utils.warning('Using preesixent yolk...')
      }
    }

    if (!fs.existsSync(this.settings.config.snapshot_dir)) {
      shx.mkdir('-p', this.settings.config.snapshot_dir)
    }

    await this.settings.loadRemix(this.snapshot_basename, this.settings.config.theme)

    if (Utils.isLive()) {
      console.log(chalk.red('>>> eggs: This is a live system! An egg cannot be produced from an egg!'))
    } else {

      await this.liveCreateStructure()

      if (this.settings.distro.isCalamaresAvailable && (Pacman.isInstalledGui()) && this.settings.config.force_installer && !(await Pacman.calamaresCheck())) {
        console.log('Installing ' + chalk.bgGray('calamares') + ' due force_installer=yes.')
        await Pacman.calamaresInstall(verbose)
        const bleach = new Bleach()
        await bleach.clean(verbose)
      }

      // BACKUP
      if (backup) {
        console.log(`Follow users' data and accounts will be saved in a crypted LUKS volume:`)
        const users = await this.usersFill()
        for (let i = 0; i < users.length; i++) {
          if (users[i].saveIt) {
            let utype = 'user   '
            if (parseInt(users[i].uid) < 1000) {
              utype = 'service'
            }
            console.log(`- ${utype}: ${users[i].login.padEnd(16)} \thome: ${users[i].home}`)
            if (users[i].login !== 'root') {
              this.addRemoveExclusion(true, users[i].home)
            }
          }
        }

        // CLONE
      } else if (this.clone) {
        Utils.warning('eggs will SAVE yours users accounts and datas UNCRYPTED on the live')

        // NORMAL
      } else {
        Utils.warning('eggs will REMOVE users accounts and datas from live')
      }


      /**
       * NOTE: reCreate = false 
       * 
       * reCreate = false is just for develop
       * put reCreate = true in release
       */
      let reCreate = true
      if (reCreate) { // start pre-backup

        if (this.clone) {
          await exec(`touch ${this.settings.config.snapshot_dir}ovarium/iso/live/is-clone.md`, this.echo)
        }

        /**
         * Anche non accettando l'installazione di calamares
         * viene creata la configurazione dell'installer: krill/calamares
         * L'installer prende il tema da settings.remix.branding
         */
        this.incubator = new Incubator(this.settings.remix, this.settings.distro, this.settings.config.user_opt, verbose)
        await this.incubator.config(release)

        await this.syslinux()
        await this.isolinux(this.settings.config.theme)
        await this.kernelCopy()
        /**
         * we need different behaviour on
         * initrd for different familis
         */
        if (this.familyId === 'debian') {
          await this.initrdCopy()
        } else if (this.familyId === 'archlinux') {
          await this.initrdCreate()
        }

        if (this.settings.config.make_efi) {
          await this.makeEfi(this.settings.config.theme)
        }
        await this.bindLiveFs()

        /**
         * clone
         */
        if (this.clone) {
          await exec(`touch ${this.settings.config.snapshot_dir}ovarium/iso/live/is-clone.md`, this.echo)
        } else {
          await this.cleanUsersAccounts()
          await this.createUserLive()
          // createXdgAutostart anche per clone
          if (Pacman.isInstalledGui()) {
            await this.createXdgAutostart(this.settings.config.theme, myAddons)
            if (displaymanager() === '') {
              // If GUI is installed and not Desktop manager
              cliAutologin.addIssue(this.settings.distro.distroId, this.settings.distro.codenameId, this.settings.config.user_opt, this.settings.config.user_opt_passwd, this.settings.config.root_passwd, this.settings.work_dir.merged)
              cliAutologin.addMotd(this.settings.distro.distroId, this.settings.distro.codenameId, this.settings.config.user_opt, this.settings.config.user_opt_passwd, this.settings.config.root_passwd, this.settings.work_dir.merged)
            }
          } else {
            cliAutologin.addAutologin(this.settings.distro.distroId, this.settings.distro.codenameId, this.settings.config.user_opt, this.settings.config.user_opt_passwd, this.settings.config.root_passwd, this.settings.work_dir.merged)
          }
        }

        await this.editLiveFs()
        await this.makeSquashfs(scriptOnly)
        await this.uBindLiveFs() // Lo smonto prima della fase di backup
      }

      if (backup) {
        await exec('eggs syncto', Utils.setEcho(true))
        Utils.warning(`Waiting 10s, before to move ${luksFile} in ${this.settings.config.snapshot_dir}ovarium/iso/live`)
        await exec('sleep 10', Utils.setEcho(false))
        Utils.warning(`moving ${luksFile} in ${this.settings.config.snapshot_dir}ovarium/iso/live`)
        await exec(`mv ${luksFile} ${this.settings.config.snapshot_dir}ovarium/iso/live`, this.echo)
      }

      const xorrisoCommand = this.makeDotDisk(backup)

      /**
       * patch to emulate miso/archiso on archilinux
       */
      if (this.familyId === 'archlinux') {
        if (this.settings.distro.distroId === 'ManjaroLinux') {
          await exec(`mkdir ${this.settings.work_dir.pathIso}manjaro/x86_64 -p`, this.echo)
          await exec(`ln ${this.settings.work_dir.pathIso}live/filesystem.squashfs ${this.settings.work_dir.pathIso}manjaro/x86_64/livefs.sfs`, this.echo)
          await exec(`md5sum ${this.settings.work_dir.pathIso}live/filesystem.squashfs > ${this.settings.work_dir.pathIso}manjaro/x86_64/livefs.md5`, this.echo)
        } else if (this.settings.distro.distroId === 'Arch') {
          await exec(`mkdir ${this.settings.work_dir.pathIso}arch/x86_64 -p`, this.echo)
          await exec(`ln ${this.settings.work_dir.pathIso}live/filesystem.squashfs          ${this.settings.work_dir.pathIso}arch/x86_64/airootfs.sfs`, this.echo)
          await exec(`sha512sum ${this.settings.work_dir.pathIso}live/filesystem.squashfs > ${this.settings.work_dir.pathIso}arch/x86_64/airootfs.sha512`, this.echo)          
        }
    }
      await this.makeIso(xorrisoCommand, scriptOnly)
    }
  }

  /**
   * Crea la struttura della workdir
   */
  async liveCreateStructure() {
    if (this.verbose) {
      console.log('Overy: liveCreateStructure')
    }

    Utils.warning(`Creating egg in ${this.settings.work_dir.path}`)

    let cmd
    if (!fs.existsSync(this.settings.work_dir.path)) {
      cmd = `mkdir -p ${this.settings.work_dir.path}`
      this.tryCatch(cmd)
    }

    if (!fs.existsSync(this.settings.work_dir.path + '/README.md')) {
      cmd = `cp ${path.resolve(__dirname, '../../conf/README.md')} ${this.settings.work_dir.path}README.md`
      this.tryCatch(cmd)
    }

    if (!fs.existsSync(this.settings.work_dir.lowerdir)) {
      cmd = `mkdir -p ${this.settings.work_dir.lowerdir}`
      this.tryCatch(cmd)
    }

    if (!fs.existsSync(this.settings.work_dir.upperdir)) {
      cmd = `mkdir -p ${this.settings.work_dir.upperdir}`
      this.tryCatch(cmd)
    }

    if (!fs.existsSync(this.settings.work_dir.workdir)) {
      cmd = `mkdir -p ${this.settings.work_dir.workdir}`
      this.tryCatch(cmd)
    }

    if (!fs.existsSync(this.settings.work_dir.merged)) {
      cmd = `mkdir -p ${this.settings.work_dir.merged}`
      this.tryCatch(cmd)
    }

    /**
     * Creo le directory di destinazione per boot, efi, isolinux e live
     * precedentemente in isolinux
     */
    if (!fs.existsSync(this.settings.work_dir.pathIso)) {
      cmd = `mkdir -p ${this.settings.work_dir.pathIso}/boot/grub/${Utils.machineUEFI()}`
      this.tryCatch(cmd)

      cmd = `mkdir -p ${this.settings.work_dir.pathIso}/efi/boot`
      this.tryCatch(cmd)

      let liveBsseDir = 'live'
      cmd = `mkdir -p ${this.settings.work_dir.pathIso}/isolinux`
      this.tryCatch(cmd)

      cmd = `mkdir -p ${this.settings.work_dir.pathIso}live`
      this.tryCatch(cmd)
    }
  }

  /**
   * 
   * @param cmd 
   */
  async tryCatch(cmd = '') {
    try {
      await exec(cmd, this.echo)
    } catch (error) {
      console.log(`Error: ${error}`)
      await Utils.pressKeyToExit(cmd)
    }
  }

  /**
   * editLiveFs
   * - Truncate logs, remove archived log
   * - Allow all fixed drives to be mounted with pmount
   * - Enable or disable password login trhough ssh for users (not root)
   * - Create an empty /etc/fstab
   * - Blanck /etc/machine-id
   * - Add some basic files to /dev
   * - Clear configs from /etc/network/interfaces, wicd and NetworkManager and netman
   */
  async editLiveFs() {
    if (this.verbose) {
      console.log('ovary: editLiveFs')
    }

    if (this.familyId === 'debian') {
      // Aggiungo UMASK=0077 in /etc/initramfs-tools/conf.d/calamares-safe-initramfs.conf
      const text = 'UMASK=0077\n'
      const file = '/etc/initramfs-tools/conf.d/eggs-safe-initramfs.conf'
      Utils.write(file, text)
    }

    // Truncate logs, remove archived logs.
    let cmd = `find ${this.settings.work_dir.merged}/var/log -name "*gz" -print0 | xargs -0r rm -f`
    await exec(cmd, this.echo)
    cmd = `find ${this.settings.work_dir.merged}/var/log/ -type f -exec truncate -s 0 {} \\;`
    await exec(cmd, this.echo)

    // Allow all fixed drives to be mounted with pmount
    if (this.settings.config.pmount_fixed && fs.existsSync(`${this.settings.work_dir.merged}/etc/pmount.allow`)) {
      // MX aggiunto /etc
      await exec(`sed -i 's:#/dev/sd\[a-z\]:/dev/sd\[a-z\]:' ${this.settings.work_dir.merged}/etc/pmount.allow`, this.echo)
    }

    // Enable or disable password login through ssh for users (not root)
    // Remove obsolete live-config file
    if (fs.existsSync(`${this.settings.work_dir.merged}lib/live/config/1161-openssh-server`)) {
      await exec('rm -f "$work_dir"/myfs/lib/live/config/1161-openssh-server', this.echo)
    }

    if (fs.existsSync(`${this.settings.work_dir.merged}/etc/ssh/sshd_config`)) {
      await exec(`sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' ${this.settings.work_dir.merged}/etc/ssh/sshd_config`, this.echo)
      await (this.settings.config.ssh_pass
        ? exec(`sed -i 's|.*PasswordAuthentication.*no|PasswordAuthentication yes|' ${this.settings.work_dir.merged}/etc/ssh/sshd_config`, this.echo)
        : exec(`sed -i 's|.*PasswordAuthentication.*yes|PasswordAuthentication no|' ${this.settings.work_dir.merged}/etc/ssh/sshd_config`, this.echo))
    }

    /**
     * /etc/fstab should exist, even if it's empty,
     * to prevent error messages at boot
     */
    await exec(`rm ${this.settings.work_dir.merged}/etc/fstab`, this.echo)
    await exec(`touch ${this.settings.work_dir.merged}/etc/fstab`, this.echo)

    /**
     * Remove crypttab if exists 
     * this is crucial for tpm systems.
     */
    if (fs.existsSync(`${this.settings.work_dir.merged}/etc/crypttab`)) {
      await exec(`rm ${this.settings.work_dir.merged}/etc/crypttab`, this.echo)
      // await exec(`touch ${this.settings.work_dir.merged}/etc/crypttab`, echo)
    }

    /**
     * Blank out systemd machine id. 
     * If it does not exist, systemd-journald will fail, 
     * but if it exists and is empty, systemd will automatically
     * set up a new unique ID.
     */
    if (fs.existsSync(`${this.settings.work_dir.merged}/etc/machine-id`)) {
      await exec(`rm ${this.settings.work_dir.merged}/etc/machine-id`, this.echo)
      await exec(`touch ${this.settings.work_dir.merged}/etc/machine-id`, this.echo)
      Utils.write(`${this.settings.work_dir.merged}/etc/machine-id`, ':')
    }

    /**
     * LMDE4: utilizza UbuntuMono16.pf2
     * aggiungo un link a /boot/grub/fonts/UbuntuMono16.pf2
     */
    shx.cp(`${this.settings.work_dir.merged}/boot/grub/fonts/unicode.pf2`, `${this.settings.work_dir.merged}/boot/grub/fonts/UbuntuMono16.pf2`)

    /**
    * cleaning /etc/resolv.conf
    */
    let resolvFile = `${this.settings.work_dir.merged}/etc/resolv.conf`
    shx.rm(resolvFile)

    /**
     * Per tutte le distro systemd
     */
    if (Utils.isSystemd()) {
      const systemdctl = new Systemctl(this.verbose)

      /**
       * systemd-systemd-resolved
       */
      let resolvContent = ''
      if (await systemdctl.isActive('systemd-resolved.service')) {
        await systemdctl.stop('systemd-resolved.service')
        resolvContent = 'nameserver 127.0.0.53\noptions edns0 trust-ad\nsearch .\n'
      }
      fs.writeFileSync(resolvFile, resolvContent)

      if (await systemdctl.isEnabled('systemd-networkd.service')) {
        await systemdctl.disable('systemd-networkd.service', this.settings.work_dir.merged, true)
      }

      if (await systemdctl.isEnabled('remote-cryptsetup.target')) {
        await systemdctl.disable('remote-cryptsetup.target', this.settings.work_dir.merged, true)
      }

      if (await systemdctl.isEnabled('speech-dispatcherd.service')) {
        await systemdctl.disable('speech-dispatcherd.service', this.settings.work_dir.merged, true)
      }

      if (await systemdctl.isEnabled('wpa_supplicant-nl80211@.service')) {
        await systemdctl.disable('wpa_supplicant-nl80211@.service', this.settings.work_dir.merged, true)
      }

      if (await systemdctl.isEnabled('wpa_supplicant@.service')) {
        await systemdctl.disable('wpa_supplicant@.service', this.settings.work_dir.merged, true)
      }

      if (await systemdctl.isEnabled('wpa_supplicant-wired@.service')) {
        await systemdctl.disable('wpa_supplicant-wired@.service', this.settings.work_dir.merged, true)
      }

      /**
       * All systemd distros rm
       */
      await exec(`rm -f ${this.settings.work_dir.merged}/var/lib/wicd/configurations/*`, this.echo)
      await exec(`rm -f ${this.settings.work_dir.merged}/etc/wicd/wireless-settings.conf`, this.echo)
      await exec(`rm -f ${this.settings.work_dir.merged}/etc/NetworkManager/system-connections/*`, this.echo)
      await exec(`rm -f ${this.settings.work_dir.merged}/etc/network/wifi/*`, this.echo)
      /**
       * removing from /etc/network/:
       * if-down.d if-post-down.d if-pre-up.d if-up.d interfaces interfaces.d
       */
      const cleanDirs = ['if-down.d', 'if-post-down.d', 'if-pre-up.d', 'if-up.d', 'interfaces.d']
      let cleanDir = ''
      for (cleanDir of cleanDirs) {
        await exec(`rm -f ${this.settings.work_dir.merged}/etc/network/${cleanDir}/wpasupplicant`, this.echo)
      }
    }


    /**
     * Clear configs from /etc/network/interfaces, wicd and NetworkManager
     * and netman, so they aren't stealthily included in the snapshot.
     */
    if (this.familyId === 'debian') {
      if (fs.existsSync(`${this.settings.work_dir.merged}/etc/network/interfaces`)) {
        await exec(`rm ${this.settings.work_dir.merged}/etc/network/interfaces`, this.echo)
      }

      await exec(`touch ${this.settings.work_dir.merged}/etc/network/interfaces`, this.echo)
      Utils.write(`${this.settings.work_dir.merged}/etc/network/interfaces`, 'auto lo\niface lo inet loopback')
    }

    /**
     * add some basic files to /dev
     */
    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/console`)) {
      await exec(`mknod -m 622 ${this.settings.work_dir.merged}/dev/console c 5 1`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/null`)) {
      await exec(`mknod -m 666 ${this.settings.work_dir.merged}/dev/null c 1 3`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/zero`)) {
      await exec(`mknod -m 666 ${this.settings.work_dir.merged}/dev/zero c 1 5`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/ptmx`)) {
      await exec(`mknod -m 666 ${this.settings.work_dir.merged}/dev/ptmx c 5 2`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/tty`)) {
      await exec(`mknod -m 666 ${this.settings.work_dir.merged}/dev/tty c 5 0`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/random`)) {
      await exec(`mknod -m 444 ${this.settings.work_dir.merged}/dev/random c 1 8`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/urandom`)) {
      await exec(`mknod -m 444 ${this.settings.work_dir.merged}/dev/urandom c 1 9`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/{console,ptmx,tty}`)) {
      await exec(`chown -v root:tty ${this.settings.work_dir.merged}/dev/{console,ptmx,tty}`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/fd`)) {
      await exec(`ln -sv /proc/self/fd ${this.settings.work_dir.merged}/dev/fd`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/stdin`)) {
      await exec(`ln -sv /proc/self/fd/0 ${this.settings.work_dir.merged}/dev/stdin`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/stdout`)) {
      await exec(`ln -sv /proc/self/fd/1 ${this.settings.work_dir.merged}/dev/stdout`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/stderr`)) {
      await exec(`ln -sv /proc/self/fd/2 ${this.settings.work_dir.merged}/dev/stderr`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/core`)) {
      await exec(`ln -sv /proc/kcore ${this.settings.work_dir.merged}/dev/core`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/shm`)) {
      await exec(`mkdir -v ${this.settings.work_dir.merged}/dev/shm`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/pts`)) {
      await exec(`mkdir -v ${this.settings.work_dir.merged}/dev/pts`, this.echo)
    }

    if (!fs.existsSync(`${this.settings.work_dir.merged}/dev/shm`)) {
      await exec(`chmod 1777 ${this.settings.work_dir.merged}/dev/shm`, this.echo)
    }

    /**
     * Assegno 1777 a /tmp
     * creava problemi con MXLINUX
     */
    if (!fs.existsSync(`${this.settings.work_dir.merged}/tmp`)) {
      await exec(`mkdir ${this.settings.work_dir.merged}/tmp`, this.echo)
    }

    await exec(`chmod 1777 ${this.settings.work_dir.merged}/tmp`, this.echo)
  }

  /**
   * syslinux
   */
  async syslinux() {
    if (this.verbose) {
      console.log('ovary: syslinux')
      console.log('syslinux path: ' + this.settings.distro.syslinuxPath)
    }

    await exec(`cp ${this.settings.distro.syslinuxPath}/vesamenu.c32 ${this.settings.work_dir.pathIso}/isolinux/`, this.echo)
    await exec(`cp ${this.settings.distro.syslinuxPath}/chain.c32 ${this.settings.work_dir.pathIso}/isolinux/`, this.echo)
    /**
     * per openSuse non sono riusciuto a determinare
     * quale pacchetto installi:
     * ldllinux.c43, libcom32 e libutil.c32
     */
    if (this.familyId !== 'suse') {
      await exec(`cp ${this.settings.distro.syslinuxPath}/ldlinux.c32 ${this.settings.work_dir.pathIso}/isolinux/`, this.echo)
      await exec(`cp ${this.settings.distro.syslinuxPath}/libcom32.c32 ${this.settings.work_dir.pathIso}/isolinux/`, this.echo)
      await exec(`cp ${this.settings.distro.syslinuxPath}/libutil.c32 ${this.settings.work_dir.pathIso}/isolinux/`, this.echo)
    }
  }

  /**
   *  async isolinux
   */
  async isolinux(theme = 'eggs') {
    if (this.verbose) {
      console.log('ovary: isolinux')
    }


    /**
     * isolinux.bin
     */
    await exec(`cp ${this.settings.distro.isolinuxPath}/isolinux.bin ${this.settings.work_dir.pathIso}/isolinux/`, this.echo)

    /**
     * isolinux.theme.cfg
     */
    const isolinuxThemeDest = this.settings.work_dir.pathIso + 'isolinux/isolinux.theme.cfg'
    const isolinuxThemeSrc = path.resolve(__dirname, `../../addons/${theme}/theme/livecd/isolinux.theme.cfg`)
    if (!fs.existsSync(isolinuxThemeSrc)) {
      Utils.warning('Cannot find: ' + isolinuxThemeSrc)
      process.exit()
    }
    fs.copyFileSync(isolinuxThemeSrc, isolinuxThemeDest)

    /**
     * isolinux.cfg from isolinux.template.cfg
     */
    const isolinuxDest = this.settings.work_dir.pathIso + 'isolinux/isolinux.cfg'
    let isolinuxTemplate = path.resolve(__dirname, `../../addons/templates/isolinux.template`)
    if (!fs.existsSync(isolinuxTemplate)) {
      Utils.warning('Cannot find: ' + isolinuxTemplate)
      process.exit()
    }

    /**
     * kernel_parameters are used by miso, archiso
     */
    let kernel_parameters = `boot=live components locales=${process.env.LANG}`
    if (this.familyId === 'archlinux') {
      let volid = Utils.getVolid(this.settings.remix.name)
      if (this.settings.distro.distroId === 'ManjaroLinux') {
        kernel_parameters += ` misobasedir=manjaro misolabel=${volid}`
      } else if (this.settings.distro.distroId === 'Arch') {
        kernel_parameters += ` archisobasedir=arch archisolabel=${volid} cow_spacesize=4G`
      }
    }

    const template = fs.readFileSync(isolinuxTemplate, 'utf8')
    const view = {
      fullname: this.settings.remix.fullname.toUpperCase(),
      kernel: Utils.kernelVersion(),
      vmlinuz: `/live${this.settings.vmlinuz}`,
      initrdImg: `/live${this.settings.initrdImg}`,
      kernel_parameters: kernel_parameters,
    }
    fs.writeFileSync(isolinuxDest, mustache.render(template, view))

    /**
     * splash
     */
    const splashDest = `${this.settings.work_dir.pathIso}/isolinux/splash.png`
    const splashSrc = path.resolve(__dirname, `../../addons/${theme}/theme/livecd/splash.png`)
    if (!fs.existsSync(splashSrc)) {
      Utils.warning('Cannot find: ' + splashSrc)
      process.exit()
    }
    fs.copyFileSync(splashSrc, splashDest)
  }

  /**
   * copy kernel
   */
  async kernelCopy() {
    if (this.verbose) {
      console.log('ovary: kernelCopy')
    }

    let lackVmlinuzImage = false
    if (fs.existsSync(this.settings.kernel_image)) {
      console.log('kernel image:' + this.settings.kernel_image)
      await exec(`cp ${this.settings.kernel_image} ${this.settings.work_dir.pathIso}/live/`, this.echo)
    } else {
      Utils.error(`Cannot find ${this.settings.kernel_image}`)
      lackVmlinuzImage = true
    }

    if (lackVmlinuzImage) {
      Utils.warning('Try to edit /etc/penguins-eggs.d/eggs.yaml and check for')
      Utils.warning(`vmlinuz: ${this.settings.kernel_image}`)
      process.exit(1)
    }
  }

  /**
   * necessita di echoYes
   */
  async initrdCreate() {
    let initrdImg = Utils.initrdImg()
    initrdImg = initrdImg.substring(initrdImg.lastIndexOf('/') + 1)
    Utils.warning(`Creating ${initrdImg} in ${this.settings.work_dir.pathIso}/live/`)
    if (this.settings.distro.distroId === 'ManjaroLinux') {
      await exec(`mkinitcpio -c ${path.resolve(__dirname, '../../mkinitcpio/manjaro/mkinitcpio-produce.conf')} -g ${this.settings.work_dir.pathIso}/live/${initrdImg}`, Utils.setEcho(true))
    } else if (this.settings.distro.distroId === 'Arch') {
      await exec(`mkinitcpio -c ${path.resolve(__dirname, '../../mkinitcpio/archlinux/mkinitcpio-produce.conf')} -g ${this.settings.work_dir.pathIso}/live/${initrdImg}`, Utils.setEcho(true))
    }
  }

  /**
   * We must upgrade to initrdCreate for Debian/Ubuntu
   * @returns 
   */
  async initrdCopy(verbose = false) {
    let isCrypted = false

    Utils.warning(`initrdCreate`)

    if (fs.existsSync(`/etc/crypttab`)) {
      isCrypted = true
      await exec(`mv /etc/crypttab /etc/crypttab.saved`, this.echo)
    }

    await exec(`mkinitramfs -o ${this.settings.work_dir.pathIso}/live/initrd.img-$(uname -r) ${this.toNull}`, this.echo)

    if (isCrypted) {
      await exec(`mv /etc/crypttab.saved /etc/crypttab`, this.echo)
    }

    /*
 
    Utils.warning(`initrdCopy`)
    if (this.verbose) {
      console.log('ovary: initrdCopy')
    }
    let lackInitrdImage = false
    if (fs.existsSync(this.settings.initrd_image)) {
      await exec(`cp ${this.settings.initrd_image} ${this.settings.work_dir.pathIso}/live/`, this.echo)
    } else {
      Utils.error(`Cannot find ${this.settings.initrdImg}`)
      lackInitrdImage = true
    }
 
    if (lackInitrdImage) {
      Utils.warning('Try to edit /etc/penguins-eggs.d/eggs.yaml and check for')
      Utils.warning(`initrd_img: ${this.settings.initrd_image}`)
      process.exit(1)
    }
    */
  }

  /**
   * squashFs: crea in live filesystem.squashfs
   */
  async makeSquashfs(scriptOnly = false) {
    if (this.verbose) {
      console.log('ovary: makeSquashfs')
    }

    /**
     * exclude all the accurence of cryptdisks in rc0.d, etc
     */
    let fexcludes = [
      "/boot/efi/EFI",
      "/etc/fstab",
      "/etc/mtab",
      "/etc/udev/rules.d/70-persistent-cd.rules",
      "/etc/udev/rules.d/70-persistent-net.rules"
    ]

    for (let i in fexcludes) {
      this.addRemoveExclusion(true, fexcludes[i])
    }

    /**
     * Non sò che fa, ma sicuro non serve per archlinux
     */
    if (this.familyId === 'debian') {
      const rcd = ['rc0.d', 'rc1.d', 'rc2.d', 'rc3.d', 'rc4.d', 'rc5.d', 'rc6.d', 'rcS.d']
      let files: string[]
      for (const i in rcd) {
        files = fs.readdirSync(`${this.settings.work_dir.merged}/etc/${rcd[i]}`)
        for (const n in files) {
          if (files[n].includes('cryptdisks')) {
            this.addRemoveExclusion(true, `/etc/${rcd[i]}${files[n]}`)
          }
        }
      }
    }

    if (shx.exec('/usr/bin/test -L /etc/localtime', { silent: true }) && shx.exec('cat /etc/timezone', { silent: true }) !== 'Europe/Rome') {
      //this.addRemoveExclusion(true, '/etc/localtime')
    }

    this.addRemoveExclusion(true, this.settings.config.snapshot_dir /* .absolutePath() */)

    if (fs.existsSync(`${this.settings.work_dir.pathIso}/live/filesystem.squashfs`)) {
      fs.unlinkSync(`${this.settings.work_dir.pathIso}/live/filesystem.squashfs`)
    }

    const compression = `-comp ${this.settings.config.compression}`

    // let cmd = `mksquashfs ${this.settings.work_dir.merged} ${this.settings.work_dir.pathIso}live/filesystem.squashfs ${compression} -wildcards -ef ${this.settings.config.snapshot_excludes} ${this.settings.session_excludes}`
    let cmd = `mksquashfs ${this.settings.work_dir.merged} ${this.settings.work_dir.pathIso}live/filesystem.squashfs ${compression} -wildcards -ef ${this.settings.config.snapshot_excludes} ${this.settings.session_excludes}`
    cmd = cmd.replace(/\s\s+/g, ' ')
    Utils.writeX(`${this.settings.work_dir.path}mksquashfs`, cmd)
    if (!scriptOnly) {
      Utils.warning('squashing filesystem: ' + compression)
      await exec(cmd, Utils.setEcho(true))
    }
  }

  /**
   * Restituisce true per le direcory da montare con overlay
   *
   * Ci sono tre tipologie:
   *
   * - normal solo la creazione della directory, nessun mount
   * - merged creazione della directory e mount ro
   * - mergedAndOverlay creazione directory, overlay e mount rw
   *
   * @param dir
   */
  mergedAndOvelay(dir: string): boolean {
    const mountDirs = ['etc', 'boot', 'usr', 'var']
    let mountDir = ''
    let overlay = false
    for (mountDir of mountDirs) {
      if (mountDir === dir) {
        overlay = true
      }
    }

    return overlay
  }

  /**
   * Ritorna true se c'è bisogno del mount --bind
   *
   * Ci sono tre tipologie:
   *
   * - normal solo la creazione della directory, nessun mount
   * - merged creazione della directory e mount ro
   * - mergedAndOverlay creazione directory, overlay e mount rw
   */
  merged(dir: string): boolean {
    const nomergedDirs = [
      'cdrom',
      'dev',
      'media',
      'mnt',
      'proc',
      'run',
      'sys',
      'swapfile',
      'tmp'
    ]
    if (!this.clone) {
      nomergedDirs.push('home')
    }

    // deepin ha due directory /data e recovery
    nomergedDirs.push('data', 'recovery')

    let merged = true
    for (const nomergedDir of nomergedDirs) {
      if (dir === nomergedDir) {
        merged = false
      }
    }

    return merged
  }

  /**
   * Esegue il bind del fs live e
   * crea lo script bind
   *
   * @param verbose
   */
  async bindLiveFs() {
    if (this.verbose) {
      console.log('ovary: bindLiveFs')
    }

    /**
     * Attenzione:
     * fs.readdirSync('/', { withFileTypes: true })
     * viene ignorato da Node8, ma da problemi da Node10 in poi
     */
    const dirs = fs.readdirSync('/')
    const startLine = '#############################################################'
    const titleLine = '# -----------------------------------------------------------'
    const endLine = '# ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'

    let lnkDest = ''
    let cmd = ''
    const cmds: string[] = []
    cmds.push('# NOTE: cdrom, dev, live, media, mnt, proc, run, sys and tmp', `#       need just a mkdir in ${this.settings.work_dir.merged}`)
    cmds.push(`# host: ${os.hostname()} user: ${Utils.getPrimaryUser()}\n`)

    for (const dir of dirs) {
      cmds.push(startLine)
      if (N8.isDirectory(dir)) {
        if (dir !== 'lost+found') {
          cmd = `# /${dir} is a directory`
          if (this.mergedAndOvelay(dir)) {
            /**
             * mergedAndOverlay creazione directory, overlay e mount rw
             */
            cmds.push(`${cmd} need to be presente, and rw`, titleLine, '# create mountpoint lower')
            cmds.push(await makeIfNotExist(`${this.settings.work_dir.lowerdir}/${dir}`), `# first: mount /${dir} rw in ${this.settings.work_dir.lowerdir}/${dir}`)
            cmds.push(await rexec(`mount --bind --make-slave /${dir} ${this.settings.work_dir.lowerdir}/${dir}`, this.verbose), '# now remount it ro')
            cmds.push(await rexec(`mount -o remount,bind,ro ${this.settings.work_dir.lowerdir}/${dir}`, this.verbose), `\n# second: create mountpoint upper, work and ${this.settings.work_dir.merged} and mount ${dir}`)
            cmds.push(await makeIfNotExist(`${this.settings.work_dir.upperdir}/${dir}`, this.verbose))
            cmds.push(await makeIfNotExist(`${this.settings.work_dir.workdir}/${dir}`, this.verbose))
            cmds.push(await makeIfNotExist(`${this.settings.work_dir.merged}/${dir}`, this.verbose), `\n# thirth: mount /${dir} rw in ${this.settings.work_dir.merged}`)
            cmds.push(await rexec(`mount -t overlay overlay -o lowerdir=${this.settings.work_dir.lowerdir}/${dir},upperdir=${this.settings.work_dir.upperdir}/${dir},workdir=${this.settings.work_dir.workdir}/${dir} ${this.settings.work_dir.merged}/${dir}`, this.verbose))
          } else if (this.merged(dir)) {
            /*
             * merged creazione della directory e mount ro
             */
            cmds.push(`${cmd} need to be present, mount ro`, titleLine)
            cmds.push(await makeIfNotExist(`${this.settings.work_dir.merged}/${dir}`, this.verbose))
            cmds.push(await rexec(`mount --bind --make-slave /${dir} ${this.settings.work_dir.merged}/${dir}`, this.verbose))
            cmds.push(await rexec(`mount -o remount,bind,ro ${this.settings.work_dir.merged}/${dir}`, this.verbose))
          } else {
            /**
             * normal solo la creazione della directory, nessun mount
             */
            cmds.push(`${cmd} need to be present, no mount`, titleLine)
            cmds.push(await makeIfNotExist(`${this.settings.work_dir.merged}/${dir}`, this.verbose), `# mount -o bind /${dir} ${this.settings.work_dir.merged}/${dir}`)
          }
        }
      } else if (N8.isFile(dir)) {
        cmds.push(`# /${dir} is just a file`, titleLine)
        if (!fs.existsSync(`${this.settings.work_dir.merged}/${dir}`)) {
          cmds.push(await rexec(`cp /${dir} ${this.settings.work_dir.merged}`, this.verbose))
        } else {
          cmds.push('# file exist... skip')
        }
      } else if (N8.isSymbolicLink(dir)) {
        lnkDest = fs.readlinkSync(`/${dir}`)
        cmds.push(
          `# /${dir} is a symbolic link to /${lnkDest} in the system`,
          '# we need just to recreate it',
          `# ln -s ${this.settings.work_dir.merged}/${lnkDest} ${this.settings.work_dir.merged}/${lnkDest}`,
          "# but we don't know if the destination exist, and I'm too lazy today. So, for now: ",
          titleLine
        )
        if (!fs.existsSync(`${this.settings.work_dir.merged}/${dir}`)) {
          if (fs.existsSync(lnkDest)) {
            cmds.push(`ln -s ${this.settings.work_dir.merged}/${lnkDest} ${this.settings.work_dir.merged}/${lnkDest}`)
          } else {
            cmds.push(await rexec(`cp -r /${dir} ${this.settings.work_dir.merged}`, this.verbose))
          }
        } else {
          cmds.push('# SymbolicLink exist... skip')
        }
      }

      cmds.push(endLine)
    }

    Utils.writeXs(`${this.settings.work_dir.path}bind`, cmds)
  }

  /**
   * ubind del fs live
   * @param verbose
   */
  async uBindLiveFs() {
    if (this.verbose) {
      console.log('ovary: uBindLiveFs')
    }

    const cmds: string[] = []
    cmds.push('# NOTE: home, cdrom, dev, live, media, mnt, proc, run, sys and tmp', `#       need just to be removed in ${this.settings.work_dir.merged}`)
    cmds.push(`# host: ${os.hostname()} user: ${Utils.getPrimaryUser()}\n`)

    // await exec(`/usr/bin/pkill mksquashfs; /usr/bin/pkill md5sum`, {echo: true})
    if (fs.existsSync(this.settings.work_dir.merged)) {
      const bindDirs = fs.readdirSync(this.settings.work_dir.merged, {
        withFileTypes: true
      })


      for (const dir of bindDirs) {
        const dirname = N8.dirent2string(dir)

        cmds.push('#############################################################')
        if (N8.isDirectory(dirname)) {
          cmds.push(`\n# directory: ${dirname}`)
          if (this.mergedAndOvelay(dirname)) {
            cmds.push(`\n# ${dirname} has overlay`, `\n# First, umount it from ${this.settings.work_dir.path}`)
            cmds.push(await rexec(`umount ${this.settings.work_dir.merged}/${dirname}`, this.verbose), `\n# Second, umount it from ${this.settings.work_dir.lowerdir}`)
            cmds.push(await rexec(`umount ${this.settings.work_dir.lowerdir}/${dirname}`, this.verbose))
          } else if (this.merged(dirname)) {
            cmds.push(await rexec(`umount ${this.settings.work_dir.merged}/${dirname}`, this.verbose))
          }

          cmds.push(`\n# remove in ${this.settings.work_dir.merged} and ${this.settings.work_dir.lowerdir}`)

          /**
           * We can't remove the nest!!!
           */
          let nest = this.settings.work_dir.path.split('/')
          if (dirname !== nest[1]) { // We can't remove first level nest
            cmds.push(await rexec(`rm ${this.settings.work_dir.merged}/${dirname} -rf`, this.verbose))
          }
        } else if (N8.isFile(dirname)) {
          cmds.push(`\n# ${dirname} = file`)
          cmds.push(await rexec(`rm ${this.settings.work_dir.merged}/${dirname}`, this.verbose))
        } else if (N8.isSymbolicLink(dirname)) {
          cmds.push(`\n# ${dirname} = symbolicLink`)
          cmds.push(await rexec(`rm ${this.settings.work_dir.merged}/${dirname}`, this.verbose))
        }
      }
    }
    if (this.clone) {
      cmds.push(await rexec(`umount ${this.settings.work_dir.path}/filesystem.squashfs/home`, this.verbose))
    }


    Utils.writeXs(`${this.settings.work_dir.path}ubind`, cmds)
  }

  /**
   * bind dei virtual file system
   */
  async bindVfs() {
    const cmds: string[] = []
    cmds.push(
      `mount -o bind /dev ${this.settings.work_dir.merged}/dev`,
      `mount -o bind /dev/pts ${this.settings.work_dir.merged}/dev/pts`,
      `mount -o bind /proc ${this.settings.work_dir.merged}/proc`,
      `mount -o bind /sys ${this.settings.work_dir.merged}/sys`,
      `mount -o bind /run ${this.settings.work_dir.merged}/run`
    )
    Utils.writeXs(`${this.settings.work_dir.path}bindvfs`, cmds)
  }

  /**
   *
   * @param verbose
   */
  async ubindVfs() {
    const cmds: string[] = []
    cmds.push(`umount ${this.settings.work_dir.merged}/dev/pts`, `umount ${this.settings.work_dir.merged}/dev`, `umount ${this.settings.work_dir.merged}/proc`, `umount ${this.settings.work_dir.merged}/run`, `umount ${this.settings.work_dir.merged}/sys`)
    Utils.writeXs(`${this.settings.work_dir.path}ubindvfs`, cmds)
  }

  /**
   *
   * @param verbose
   */
  async cleanUsersAccounts() {
    /**
     * delete all user in chroot
     */
    const cmds: string[] = []
    const cmd = `chroot ${this.settings.work_dir.merged} getent passwd {1000..60000} |awk -F: '{print $1}'`
    const result = await exec(cmd, {
      echo: this.verbose,
      ignore: false,
      capture: true
    })
    const users: string[] = result.data.split('\n')
    for (let i = 0; i < users.length - 1; i++) {
      // cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} deluser ${users[i]}`, verbose))
      cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} userdel ${users[i]}`, this.verbose))
    }
  }

  /**
   * list degli utenti: grep -E 1[0-9]{3}  /etc/passwd | sed s/:/\ / | awk '{print $1}'
   * create la home per user_opt
   * @param verbose
   */
  async createUserLive() {
    if (this.verbose) {
      console.log('ovary: createUserLive')
    }

    const cmds: string[] = []
    cmds.push(await rexec('chroot ' + this.settings.work_dir.merged + ' rm /home/' + this.settings.config.user_opt + ' -rf', this.verbose))
    cmds.push(await rexec('chroot ' + this.settings.work_dir.merged + ' mkdir /home/' + this.settings.config.user_opt, this.verbose))
    cmds.push(await rexec('chroot ' + this.settings.work_dir.merged + ' useradd ' + this.settings.config.user_opt + ' --home-dir /home/' + this.settings.config.user_opt + ' --shell /bin/bash ', this.verbose))
    cmds.push(await rexec('chroot ' + this.settings.work_dir.merged + ' echo ' + this.settings.config.user_opt + ':' + this.settings.config.user_opt_passwd + '| chroot ' + this.settings.work_dir.merged + ' chpasswd', this.verbose))
    cmds.push(await rexec('chroot  ' + this.settings.work_dir.merged + ' cp /etc/skel/. /home/' + this.settings.config.user_opt + ' -R', this.verbose))

    // cmds.push(await rexec('chroot  ' + this.settings.work_dir.merged + ' cp /etc/skel/. /home/' + this.settings.config.user_opt + ' -R', verbose))
    cmds.push(await rexec('chroot  ' + this.settings.work_dir.merged + ' chown ' + this.settings.config.user_opt + ':users' + ' /home/' + this.settings.config.user_opt + ' -R', this.verbose))

    if (this.familyId === 'debian') {
      // add user live to sudo
      cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG sudo ${this.settings.config.user_opt}`, this.verbose))

      // guadalinex
      if (this.settings.config.theme === 'guadalinex') {
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG adm ${this.settings.config.user_opt}`, this.verbose))
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG cdrom ${this.settings.config.user_opt}`, this.verbose))
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG dip ${this.settings.config.user_opt}`, this.verbose))
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG plugdev ${this.settings.config.user_opt}`, this.verbose))
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG lpadmin ${this.settings.config.user_opt}`, this.verbose))
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG sambashare ${this.settings.config.user_opt}`, this.verbose))
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG admin ${this.settings.config.user_opt}`, this.verbose))
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG sudo ${this.settings.config.user_opt}`, this.verbose))
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG dialout ${this.settings.config.user_opt}`, this.verbose))
        cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG tde ${this.settings.config.user_opt}`, this.verbose))
      }

    } else if (this.familyId === 'archlinux') {
      // adduser live to wheel and autologin
      // cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG wheel ${this.settings.config.user_opt}`, this.verbose))
      // in manjaro they use autologin group for the iso, if not exist create it
      // cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} test $(grep "autologin" /etc/group) || chroot ${this.settings.work_dir.merged} groupadd -r autologin`, this.verbose))
      // cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} usermod -aG autologin ${this.settings.config.user_opt}`, this.verbose))
      cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} gpasswd -a ${this.settings.config.user_opt} wheel`, this.verbose))
      cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} gpasswd -a ${this.settings.config.user_opt} sudo`, this.verbose))
      cmds.push(await rexec(`chroot ${this.settings.work_dir.merged} gpasswd -a ${this.settings.config.user_opt} autologin`, this.verbose))
    }

    if (this.familyId === 'debian' || this.familyId === 'archlinux') {
      cmds.push(await rexec('chroot ' + this.settings.work_dir.merged + ' echo root:' + this.settings.config.root_passwd + '| chroot ' + this.settings.work_dir.merged + ' chpasswd', this.verbose))
    }
  }

  /**
   *
   */
  async createXdgAutostart(theme = 'eggs', myAddons: IMyAddons) {
    if (this.verbose) {
      console.log('ovary: createXdgAutostart()')
    }

    const pathHomeLive = `/home/${this.settings.config.user_opt}`

    // Copia icona penguins-eggs
    shx.cp(path.resolve(__dirname, '../../assets/eggs.png'), '/usr/share/icons/')
    shx.cp(path.resolve(__dirname, '../../assets/krill.svg'), '/usr/share/icons/')
    shx.cp(path.resolve(__dirname, '../../assets/leaves.svg'), '/usr/share/icons/')

    /**
     * creazione dei link in /usr/share/applications
     */
    shx.cp(path.resolve(__dirname, '../../assets/penguins-eggs.desktop'), '/usr/share/applications/')

    let installerUrl = 'install-debian.desktop'
    let installerIcon = 'install-debian'
    if (Pacman.packageIsInstalled('calamares')) {
      shx.cp(path.resolve(__dirname, `../../addons/${theme}/theme/applications/install-debian.desktop`), `${this.settings.work_dir.merged}/usr/share/applications/`)
    } else {
      if (Pacman.packageIsInstalled('live-installer')) {
        // carico la policy per live-installer
        const policySource = path.resolve(__dirname, '../../assets/live-installer/com.github.pieroproietti.penguins-eggs.policy')
        const policyDest = '/usr/share/polkit-1/actions/com.github.pieroproietti.penguins-eggs.policy'
        shx.cp(policySource, policyDest)
        await exec(`sed -i 's/auth_admin/yes/' ${policyDest}`)

        // carico in filesystem.live packages-remove
        shx.cp(path.resolve(__dirname, '../../assets/live-installer/filesystem.packages-remove'), `${this.settings.work_dir.pathIso}/live/`)
        shx.touch(`${this.settings.work_dir.pathIso}/live/filesystem.packages`)

        installerUrl = 'penguins-live-installer.desktop'
        installerIcon = 'utilities-terminal'
        shx.cp(path.resolve(__dirname, '../../assets/penguins-live-installer.desktop'), `${this.settings.work_dir.merged}/usr/share/applications/`)
      } else {
        installerUrl = 'penguins-krill.desktop'
        installerIcon = 'utilities-terminal'
        shx.cp(path.resolve(__dirname, '../../assets/penguins-krill.desktop'), `${this.settings.work_dir.merged}/usr/share/applications/`)
      }
    }

    /**
     * flags
     */

    // adapt
    if (myAddons.adapt) {
      const dirAddon = path.resolve(__dirname, `../../addons/eggs/adapt/`)
      shx.cp(`${dirAddon}/applications/eggs-adapt.desktop`, `${this.settings.work_dir.merged}/usr/share/applications/`)
      shx.cp(`${dirAddon}/bin/adapt`, `${this.settings.work_dir.merged}/usr/bin/`)
      shx.chmod('+x', `${this.settings.work_dir.merged}/usr/bin/adapt`)
    }

    // ichoice
    if (myAddons.ichoice) {
      installerUrl = 'eggs-ichoice.desktop'
      installerIcon = 'system-software-install'
      const dirAddon = path.resolve(__dirname, '../../addons/eggs/ichoice/')
      shx.cp(`${dirAddon}/applications/eggs-ichoice.desktop`, `${this.settings.work_dir.merged}/usr/share/applications/`)
      shx.cp(`${dirAddon}/bin/eggs-ichoice.sh`, `${this.settings.work_dir.merged}/usr/bin/`)
      shx.chmod('+x', `${this.settings.work_dir.merged}/usr/bin/eggs-ichoice.sh`)
    }

    // pve
    if (myAddons.pve) {
      /**
       * create service pve-live
       */
      const pve = new PveLive()
      pve.create(this.settings.work_dir.merged)

      /**
       * adding a desktop link for pve
       */
      const dirAddon = path.resolve(__dirname, '../../addons/eggs/pve')
      shx.cp(`${dirAddon}/artwork/eggs-pve.png`, `${this.settings.work_dir.merged}/usr/share/icons/`)
      shx.cp(`${dirAddon}/applications/eggs-pve.desktop`, `${this.settings.work_dir.merged}/usr/share/applications/`)
    }

    // rsupport
    if (myAddons.rsupport) {
      const dirAddon = path.resolve(__dirname, '../../addons/eggs/rsupport')
      shx.cp(`${dirAddon}/applications/eggs-rsupport.desktop`, `${this.settings.work_dir.merged}/usr/share/applications/`)
      shx.cp(`${dirAddon}/artwork/eggs-rsupport.png`, `${this.settings.work_dir.merged}/usr/share/icons/`)
    }

    /**
     * configuro add-penguins-desktop-icons in /etc/xdg/autostart
     */
    const dirAutostart = `${this.settings.work_dir.merged}/etc/xdg/autostart`
    const dirRun = '/usr/bin'
    if (fs.existsSync(dirAutostart)) {
      // Creo l'avviatore xdg DEVE essere add-penguins-links.desktop
      shx.cp(path.resolve(__dirname, '../../assets/penguins-links-add.desktop'), dirAutostart)

      // Creo lo script add-penguins-links.sh
      const script = `${dirRun}/penguins-links-add.sh`
      let text = ''
      text += '#!/bin/sh\n'
      text += 'DESKTOP=$(xdg-user-dir DESKTOP)\n'
      text += '# Create ~/Desktop just in case this runs before the xdg folder creation script\n'
      text += 'mkdir -p $DESKTOP\n'
      // Anche se in lxde rimane il problema della conferma dell'avvio
      // per l'installer, lo tolgo altrimenti su LXDE riappare comunque
      text += `cp /usr/share/applications/${installerUrl} $DESKTOP\n`
      if (Pacman.packageIsInstalled('lxde-core')) {
        text += this.lxdeLink('penguins-eggs.desktop', "penguin's eggs", 'eggs')
        if (myAddons.adapt) text += this.lxdeLink('eggs-adapt.desktop', 'Adapt', 'video-display')
        if (myAddons.pve) text += this.lxdeLink('eggs-pve.desktop', 'Proxmox VE', 'proxmox-ve')
        if (myAddons.rsupport) text += this.lxdeLink('eggs-rsupport.desktop', 'Remote assistance', 'remote-assistance')
      } else {
        text += 'cp /usr/share/applications/penguins-eggs.desktop $DESKTOP\n'
        if (myAddons.adapt) text += 'cp /usr/share/applications/eggs-adapt.desktop $DESKTOP\n'
        if (myAddons.pve) text += 'cp /usr/share/applications/eggs-pve.desktop $DESKTOP\n'
        if (myAddons.rsupport) text += 'cp /usr/share/applications/eggs-rsupport.desktop $DESKTOP\n'
      }

      /**
       * enable desktop links
       */
      if (Pacman.packageIsInstalled('gdm3') || Pacman.packageIsInstalled('gdm')) {
        // GNOME
        text += `test -f /usr/share/applications/penguins-eggs.desktop && cp /usr/share/applications/penguins-eggs.desktop $DESKTOP\n`
        text += `test -f "$DESKTOP/penguins-eggs.desktop" && chmod a+x "$DESKTOP/penguins-eggs.desktop"\n`
        text += `test -f "$DESKTOP/penguins-eggs.desktop" && gio set "$DESKTOP/penguins-eggs.desktop" metadata::trusted true\n`

        text += `test -f /usr/share/applications/install-debian.desktop && cp /usr/share/applications/install-debian.desktop $DESKTOP\n`
        text += `test -f "$DESKTOP/install-debian.desktop" && chmod a+x $DESKTOP/install-debian.desktop\n`
        text += `test -f "$DESKTOP/install-debian.desktop" && gio set "$DESKTOP/install-debian.desktop" metadata::trusted true\n`
      } else {
        // OTHERS: CINNAMON/KDE/ETC
        text += `chmod +x $DESKTOP/*.desktop`
      }

      fs.writeFileSync(script, text, 'utf8')
      await exec(`chmod a+x ${script}`, this.echo)
    }

    await Xdg.autologin(Utils.getPrimaryUser(), this.settings.config.user_opt, this.settings.work_dir.merged)
  }

  /**
   * Creazione link desktop per lxde
   * @param name
   * @param icon
   */
  private lxdeLink(file: string, name: string, icon: string): string {
    const lnk = `lnk-${file}`

    let text = ''
    text += `echo "[Desktop Entry]" >$DESKTOP/${lnk}\n`
    text += `echo "Type=Link" >> $DESKTOP/${lnk}\n`
    text += `echo "Name=${name}" >> $DESKTOP/${lnk}\n`
    text += `echo "Icon=${icon}" >> $DESKTOP/${lnk}\n`
    text += `echo "URL=/usr/share/applications/${file}" >> $DESKTOP/${lnk}\n\n`

    return text
  }

  /**
   * Add or remove exclusion
   * @param add {boolean} true = add, false remove
   * @param exclusion {atring} path to add/remove
   */
  addRemoveExclusion(add: boolean, exclusion: string): void {
    if (exclusion.startsWith('/')) {
      exclusion = exclusion.slice(1) // remove / initial Non compatible with rsync
    }

    if (add) {
      this.settings.session_excludes += this.settings.session_excludes === '' ? `-e '${exclusion}' ` : ` '${exclusion}' `
    } else {
      this.settings.session_excludes.replace(` '${exclusion}'`, '')
      if (this.settings.session_excludes === '-e') {
        this.settings.session_excludes = ''
      }
    }
  }

  // #######################################################################################
  /**
   * makeEfi
  */
  // #######################################################################################
  async makeEfi(theme = 'eggs') {
    if (this.verbose) {
      console.log('ovary: makeEfi')
    }

    const memdiskDir = this.settings.work_dir.path + 'memdiskDir'
    const efiWorkDir = this.settings.efi_work
    const isoDir = this.settings.work_dir.pathIso
    // const codenameLikeId = this.settings.distro.codenameLikeId

    /**
     * il pachetto grub/grub2 DEVE essere presente
     */
    const grubName = Pacman.whichGrubIsInstalled()
    if (grubName === '') {
      Utils.error('Something went wrong! Cannot find grub')
      process.exit(1)
    }

    /**
     * Creo o cancello e creo: memdiskDir
     */
    if (fs.existsSync(memdiskDir)) {
      await exec(`rm ${memdiskDir} -rf`, this.echo)
    }

    Utils.warning('creating memdiskDir: ' + memdiskDir)
    await exec(`mkdir ${memdiskDir}`)
    await exec(`mkdir ${memdiskDir}/boot`, this.echo)
    await exec(`mkdir ${memdiskDir}/boot/grub`, this.echo)

    /**
     * for initial grub.cfg in memdisk
     */
    const grubCfg = `${memdiskDir}/boot/grub/grub.cfg`
    let text = ''
    text += 'search --file --set=root /.disk/info\n'
    text += 'set prefix=($root)/boot/grub\n'
    text += `source $prefix/${Utils.machineUEFI()}/grub.cfg\n`
    Utils.write(grubCfg, text)

    // #################################

    /**
     * start with empty efiWorkDir
     */
    if (fs.existsSync(efiWorkDir)) {
      await exec(`rm ${efiWorkDir} -rf`, this.echo)
    }

    Utils.warning('creating efiWordDir: ' + efiWorkDir)
    await exec(`mkdir ${efiWorkDir}`, this.echo)
    await exec(`mkdir ${efiWorkDir}/boot`, this.echo)
    await exec(`mkdir ${efiWorkDir}/boot/grub`, this.echo)
    await exec(`mkdir ${efiWorkDir}/boot/grub/${Utils.machineUEFI()}`, this.echo)
    await exec(`mkdir ${efiWorkDir}/efi`, this.echo)
    await exec(`mkdir ${efiWorkDir}/efi/boot`, this.echo)

    /**
    * copy splash to efiWorkDir
    */
    const splashDest = `${efiWorkDir}/boot/grub/splash.png`
    const splashSrc = path.resolve(__dirname, `../../addons/${theme}/theme/livecd/splash.png`)
    if (!fs.existsSync(splashSrc)) {
      Utils.warning('Cannot find: ' + splashSrc)
      process.exit()
    }
    await exec(`cp ${splashSrc} ${splashDest}`, this.echo)


    /**
     * copy theme
     */
    const themeDest = `${efiWorkDir}/boot/grub/theme.cfg`
    const themeSrc = path.resolve(__dirname, `../../addons/${theme}/theme/livecd/grub.theme.cfg`)
    if (!fs.existsSync(themeSrc)) {
      Utils.warning('Cannot find: ' + themeSrc)
      process.exit()
    }
    await exec(`cp ${themeSrc} ${themeDest}`, this.echo)

    /**
     * second grub.cfg file in efiWork
     */
    //         for i in $(ls /usr/lib/grub/x86_64-efi            |grep part_|grep \.mod|sed 's/.mod//'); do echo "insmod $i" >>              boot/grub/x86_64-efi/grub.cfg; done
    let cmd = `for i in $(ls /usr/lib/grub/${Utils.machineUEFI()}|grep part_|grep \.mod|sed 's/.mod//'); do echo "insmod $i" >> ${efiWorkDir}boot/grub/${Utils.machineUEFI()}/grub.cfg; done`
    await exec(cmd, this.echo)
    //     for i in efi_gop efi_uga ieee1275_fb vbe vga video_bochs video_cirrus jpeg png gfxterm ; do echo "insmod $i" >> boot/grub/x86_64-efi/grub.cfg ; done
    cmd = `for i in efi_gop efi_uga ieee1275_fb vbe vga video_bochs video_cirrus jpeg png gfxterm ; do echo "insmod $i" >> ${efiWorkDir}/boot/grub/${Utils.machineUEFI()}/grub.cfg ; done`
    await exec(cmd, this.echo)
    await exec(`echo "source /boot/grub/grub.cfg" >> ${efiWorkDir}/boot/grub/${Utils.machineUEFI()}/grub.cfg`, this.echo)


    /**
     * andiamo in memdiskDir
     */

    /**
     * make a tarred "memdisk" to embed in the grub image
     * 
     * NOTE: it's CRUCIAL to chdir before tar!!!
     */
    const currentDir = process.cwd()
    process.chdir(memdiskDir)
    await exec(`tar -cvf memdisk boot`, this.echo)
    process.chdir(currentDir)

    // make the grub image

    // -O, --format=FORMAT
    // -m --memdisk=FILE embed FILE as a memdisk image
    // -o, --output=FILE embed FILE as a memdisk image
    // -p, --prefix=DIR set prefix directory
    //                               --format=x86_64-efi         --memdisk=memdisk          --output=bootx64.efi           --prefix?DIR set prefix directory
    //          grub-mkimage         -O "x86_64-efi"             -m "memdisk"               -o "bootx64.efi"               -p '(memdisk)/boot/grub' search iso9660 configfile normal memdisk tar cat part_msdos part_gpt fat ext2 ntfs ntfscomp hfsplus chain boot linux
    await exec(`${grubName}-mkimage  -O "${Utils.machineUEFI()}" -m "${memdiskDir}/memdisk" -o "${memdiskDir}/bootx64.efi" -p '(memdisk)/boot/grub' search iso9660 configfile normal memdisk tar cat part_msdos part_gpt fat ext2 ntfs ntfscomp hfsplus chain boot linux`, this.echo)

    // popd torna in efiWorkDir

    // copy the grub image to efi/boot (to go later in the device's root)
    await exec(`cp ${memdiskDir}/bootx64.efi ${efiWorkDir}/efi/boot`, this.echo)

    // #######################

    // Do the boot image "boot/grub/efiboot.img"

    await exec(`dd if=/dev/zero of=${efiWorkDir}/boot/grub/efiboot.img bs=1K count=1440`, this.echo)
    await exec(`/sbin/mkdosfs -F 12 ${efiWorkDir}/boot/grub/efiboot.img`, this.echo)

    await exec(`mkdir ${efiWorkDir}/img-mnt`, this.echo)

    await exec(`mount -o loop ${efiWorkDir}/boot/grub/efiboot.img ${efiWorkDir}/img-mnt`, this.echo)

    await exec(`mkdir ${efiWorkDir}/img-mnt/efi`, this.echo)
    await exec(`mkdir ${efiWorkDir}/img-mnt/efi/boot`, this.echo)

    // era cp -r
    await exec(`cp ${memdiskDir}/bootx64.efi ${efiWorkDir}/img-mnt/efi/boot`, this.echo)

    // #######################

    // copy modules and font
    await exec(`cp -r /usr/lib/grub/${Utils.machineUEFI()}/* ${efiWorkDir}/boot/grub/${Utils.machineUEFI()}/`, this.echo)

    // if this doesn't work try another font from the same place (grub's default, unicode.pf2, is much larger)
    // Either of these will work, and they look the same to me. Unicode seems to work with qemu. -fsr
    if (fs.existsSync('/usr/share/grub/unicode.pf2')) {
      await exec(`cp /usr/share/grub/unicode.pf2 ${efiWorkDir}/boot/grub/font.pf2`, this.echo)
    } else if (fs.existsSync('/usr/share/grub2/ascii.pf2')) {
      await exec(`cp /usr/share/grub2/ascii.pf2 ${efiWorkDir}/boot/grub/font.pf2`, this.echo)
    }

    // doesn't need to be root-owned
    // chown -R 1000:1000 $(pwd) 2>/dev/null

    // Cleanup efi temps
    await exec(`umount ${efiWorkDir}/img-mnt`, this.echo)
    await exec(`rmdir ${efiWorkDir}/img-mnt`, this.echo)
    await exec(`rm ${memdiskDir}/img-mnt -rf`, this.echo)

    //  popd

    // Copy efi files to iso
    await exec(`rsync -avx  ${efiWorkDir}/boot ${isoDir}/`, this.echo)
    await exec(`rsync -avx ${efiWorkDir}/efi  ${isoDir}/`, this.echo)

    // Do the main grub.cfg (which gets loaded last):

    // grub.theme.cfg
    const grubThemeSrc = path.resolve(__dirname, `../../addons/${theme}/theme/livecd/grub.theme.cfg`)
    const grubThemeDest = `${isoDir}/boot/grub/theme.cfg`
    if (!fs.existsSync(grubThemeSrc)) {
      Utils.warning('Cannot find: ' + grubThemeSrc)
      process.exit()
    }
    fs.copyFileSync(grubThemeSrc, grubThemeDest)


    /**
    * prepare grub.cfg from grub.template.cfg
    */
    const grubTemplate = path.resolve(__dirname, `../../addons/templates/grub.template`)

    if (!fs.existsSync(grubTemplate)) {
      Utils.warning('Cannot find: ' + grubTemplate)
      process.exit()
    }

    /**
    * kernel_parameters are used by miso, archiso
    */
    let kernel_parameters = `boot=live components locales=${process.env.LANG}`
    if (this.familyId === 'archlinux') {
      let volid = Utils.getVolid(this.settings.remix.name)
      if (this.settings.distro.distroId === 'ManjaroLinux') {
        kernel_parameters += ` misobasedir=manjaro misolabel=${volid}`
      } else if (this.settings.distro.distroId === 'Arch') {
        kernel_parameters += ` archisobasedir=arch archisolabel=${volid} cow_spacesize=4G`
      }
    }

    const grubDest = `${isoDir}/boot/grub/grub.cfg`
    const template = fs.readFileSync(grubTemplate, 'utf8')

    const view = {
      fullname: this.settings.remix.fullname.toUpperCase(),
      kernel: Utils.kernelVersion(),
      vmlinuz: `/live${this.settings.vmlinuz}`,
      initrdImg: `/live${this.settings.initrdImg}`,
      kernel_parameters: kernel_parameters,
    }
    fs.writeFileSync(grubDest, mustache.render(template, view))

    /**
    * loopback.cfg
    */
    fs.writeFileSync(`${isoDir}/boot/grub/loopback.cfg`, 'source /boot/grub/grub.cfg\n')
  }

  // #######################################################################################

  /**
   * makeDotDisk
   * create .disk/info, .disk/mksquashfs, .disk/mkiso
   * return mkiso
   */
  makeDotDisk(backup = false): string {
    const dotDisk = this.settings.work_dir.pathIso + '/.disk'
    if (fs.existsSync(dotDisk)) {
      shx.rm('-rf', dotDisk)
    }
    shx.mkdir('-p', dotDisk)

    // .disk/info
    let file = dotDisk + '/info'
    let content = Utils.getVolid(this.settings.remix.name)
    fs.writeFileSync(file, content, 'utf-8')

    // .disk/mksquashfs
    const scripts = this.settings.work_dir.path
    shx.cp(scripts + '/mksquashfs', dotDisk + '/mksquashfs')

    // .disk/mkisofs
    content = this.xorrisoCommand(backup).replace(/\s\s+/g, ' ')
    file = dotDisk + '/mkisofs'
    fs.writeFileSync(file, content, 'utf-8')
    return content
  }

  /**
   *
   * @param backup
   * @returns cmd 4 mkiso
   */
  xorrisoCommand(backup = false): string {
    const volid = Utils.getVolid(this.settings.remix.name)

    let prefix = this.settings.config.snapshot_prefix
    if (backup) {
      prefix = prefix.slice(0, 7) === 'egg-of-' ? 'egg-eb-' + prefix.slice(7) : 'egg-eb-' + prefix
    }

    const postfix = Utils.getPostfix()
    this.settings.isoFilename = prefix + volid + postfix
    const output = this.settings.config.snapshot_dir + this.settings.isoFilename

    let command = ''
    // const appid = `-appid "${this.settings.distro.distroId}" `
    // const publisher = `-publisher "${this.settings.distro.distroId}/${this.settings.distro.codenameId}" `
    // const preparer = '-preparer "prepared by eggs <https://penguins-eggs.net>" '


    let isoHybridMbr = ``
    if (this.settings.config.make_isohybrid) {
      const isolinuxFile = this.settings.distro.isolinuxPath + 'isohdpfx.bin'
      if (fs.existsSync(isolinuxFile)) {
        isoHybridMbr = `-isohybrid-mbr ${isolinuxFile}`
      } else {
        Utils.warning(`Can't create isohybrid image. File: ${isolinuxFile} not found. \nThe resulting image will be a standard iso file`)
      }
    }

    // uefi_opt="-eltorito-alt-boot -e boot/grub/efiboot.img -isohybrid-gpt-basdat -no-emul-boot"
    let uefi_elToritoAltBoot = ''
    let uefi_e = ''
    let uefi_isohybridGptBasdat = ''
    let uefi_noEmulBoot = ''
    if (this.settings.config.make_efi) {
      uefi_elToritoAltBoot = '-eltorito-alt-boot'
      uefi_e = '-e boot/grub/efiboot.img'
      uefi_isohybridGptBasdat = '-isohybrid-gpt-basdat'
      uefi_noEmulBoot = '-no-emul-boot'
    }

    /**
      * info Debian GNU/Linux 10.8.0 "Buster" - Official i386 NETINST 20210206-10:54
      * mkisofs xorriso -as mkisofs 
      * -r 
      * -checksum_algorithm_iso md5,sha1,sha256,sha512 
      * -V 'Debian 10.8.0 i386 n' 
      * -o /srv/cdbuilder.debian.org/dst/deb-cd/out/2busteri386/debian-10.8.0-i386-NETINST-1.iso 
      *       -jigdo-jigdo /srv/cdbuilder.debian.org/dst/deb-cd/out/2busteri386/debian-10.8.0-i386-NETINST-1.jigdo 
      *       -jigdo-template /srv/cdbuilder.debian.org/dst/deb-cd/out/2busteri386/debian-10.8.0-i386-NETINST-1.template 
      *       -jigdo-map Debian=/srv/cdbuilder.debian.org/src/ftp/debian/ 
      *       -jigdo-exclude boot1 
      *       -md5-list /srv/cdbuilder.debian.org/src/deb-cd/tmp/2busteri386/buster/md5-check 
      *       -jigdo-min-file-size 1024 
      *       -jigdo-exclude 'README*' 
      *       -jigdo-exclude /doc/ 
      *       -jigdo-exclude /md5sum.txt 
      *       -jigdo-exclude /.disk/ 
      *       -jigdo-exclude /pics/ 
      *       -jigdo-exclude 'Release*' 
      *       -jigdo-exclude 'Packages*' 
      *       -jigdo-exclude 'Sources*' 
      * -J 
      * -joliet-long 
      * -cache-inodes 
      * -isohybrid-mbr syslinux/usr/lib/ISOLINUX/isohdpfx.bin 
      * -b isolinux/isolinux.bin                 
      * -c isolinux/boot.cat 
      * -boot-load-size 4 
      * -boot-info-table 
      * -no-emul-boot 
      * -eltorito-alt-boot 
      * -e boot/grub/efi.img 
      * -no-emul-boot 
      * -isohybrid-gpt-basdat 
      *         isohybrid-apm-hfsplus 
      * boot1 CD1
    
    command = `xorriso -as mkisofs \
     -r \
     -checksum_algorithm_iso md5,sha1,sha256,sha512 \
     -V ${volid} \
     -o ${output} \
     -J \
     -joliet-long \
     -cache-inodes  \
     ${isoHybridMbr} \
     -b isolinux/isolinux.bin \
     -c isolinux/boot.cat \
     -boot-load-size 4 \
     -boot-info-table \
     -no-emul-boot \
     ${uefi_elToritoAltBoot} \
     ${uefi_e} \
     ${uefi_noEmulBoot} \
     ${uefi_isohybridGptBasdat}
     ${this.settings.work_dir.pathIso}`
    */

    /**
     * how is made in refracta 
     * 
     * -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin
     * uefi_opt="-eltorito-alt-boot -e boot/grub/efiboot.img -isohybrid-gpt-basdat -no-emul-boot"
     * 
     * xorriso -as mkisofs -r \
     * -J \
     * -joliet-long \
     * -l \
     * -iso-level 3 \
     * ${isohybrid_opt} \
     * -partition_offset 16 \
     * -V "$volid" \
     * -b isolinux/isolinux.bin \
     * -c isolinux/boot.cat \
     * -no-emul-boot \
     * -boot-load-size 4 \
     * -boot-info-table \
     * ${uefi_opt} \
     * -o "$snapshot_dir"/"$filename" iso/ 
     */
    command = `xorriso -as mkisofs \
     -J \
     -joliet-long \
     -l \
     -iso-level 3 \
     ${isoHybridMbr} \
     -partition_offset 16 \
     -V ${volid} \
     -b isolinux/isolinux.bin \
     -c isolinux/boot.cat \
     -no-emul-boot \
     -boot-load-size 4 \
     -boot-info-table \
     ${uefi_elToritoAltBoot} \
     ${uefi_e} \
     ${uefi_isohybridGptBasdat} \
     ${uefi_noEmulBoot} \
     -o ${output} ${this.settings.work_dir.pathIso}`

    return command
  }

  /**
   * makeIso
   * cmd: cmd 4 xorirriso
   */
  async makeIso(cmd: string, scriptOnly = false) {
    //echo = { echo: true, ignore: false }

    if (this.verbose) {
      console.log('ovary: makeIso')
    }

    Utils.writeX(`${this.settings.work_dir.path}mkisofs`, cmd)
    if (!scriptOnly) {
      await exec(cmd, Utils.setEcho(true))
    }
  }

  /**
   * finished = show the results
   * @param scriptOnly
   */
  finished(scriptOnly = false) {
    Utils.titles('produce')
    if (!scriptOnly) {
      console.log('eggs is finished!\n\nYou can find the file iso: ' + chalk.cyanBright(this.settings.isoFilename) + '\nin the nest: ' + chalk.cyanBright(this.settings.config.snapshot_dir) + '.')
    } else {
      console.log('eggs is finished!\n\nYou can find the scripts to build iso: ' + chalk.cyanBright(this.settings.isoFilename) + '\nin the ovarium: ' + chalk.cyanBright(this.settings.work_dir.path) + '.')
      console.log('usage')
      console.log(chalk.cyanBright(`cd ${this.settings.work_dir.path}`))
      console.log(chalk.cyanBright('sudo ./bind'))
      console.log('Make all yours modifications in the directories filesystem.squashfs and iso.')
      console.log('After when you are ready:')
      console.log(chalk.cyanBright('sudo ./mksquashfs'))
      console.log(chalk.cyanBright('sudo ./mkisofs'))
      console.log(chalk.cyanBright('sudo ./ubind'))
      console.log('happy hacking!')
    }

    console.log()
    console.log('Remember, on liveCD user = ' + chalk.cyanBright(this.settings.config.user_opt) + '/' + chalk.cyanBright(this.settings.config.user_opt_passwd))
    console.log('                    root = ' + chalk.cyanBright('root') + '/' + chalk.cyanBright(this.settings.config.root_passwd))
  }

  /**
  * fill
  */
  async usersFill(): Promise<Users[]> {
    const usersArray = []
    await access('/etc/passwd', constants.R_OK | constants.W_OK);
    const passwd = fs.readFileSync('/etc/passwd', 'utf-8').split('\n')
    for (let i = 0; i < passwd.length; i++) {
      var line = passwd[i].split(':')
      const users = new Users(line[0], line[1], line[2], line[3], line[4], line[5], line[6])
      await users.getValues()
      if (users.password !== undefined) {
        usersArray.push(users)
      }
    }
    return usersArray
  }
}

/**
 * Crea il path se non esiste
 * @param path
 */
async function makeIfNotExist(path: string, verbose = false): Promise<string> {
  if (verbose) {
    console.log(`ovary: makeIfNotExist(${path})`)
  }

  const echo = Utils.setEcho(verbose)
  let cmd = `# ${path} alreasy exist`
  if (!fs.existsSync(path)) {
    cmd = `mkdir ${path} -p`
    await exec(cmd, echo)
  }
  return cmd
}

/**
 *
 * @param cmd
 * @param echo
 */
async function rexec(cmd: string, verbose = false): Promise<string> {
  const echo = Utils.setEcho(verbose)

  await exec(cmd, echo)
  return cmd
}
