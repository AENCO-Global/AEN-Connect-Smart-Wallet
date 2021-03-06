<template>
  <v-app dark>
    <!-- NAV DRAWER -->
    <v-navigation-drawer v-if="showNav" v-model="cDrawerOpen" :mini-variant="minifyDrawer" stateless app>
      <v-layout column fill-height>
        <v-list>
          <v-list-tile v-for="(item, i) in navigationItems" :key="i" :to="item.to" router exact @click="toggleNav">
            <v-list-tile-action>
              <v-icon>{{ item.icon }}</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              {{ $t('common.navigation.'+item.key) }}
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
        <v-spacer />
        <v-list>
          <v-list-tile to="/settings" @click="toggleNav">
            <v-list-tile-action>
              <v-icon>settings</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              {{ $t('common.navigation.settings') }}
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </v-layout>
    </v-navigation-drawer>

    <!-- TOP BAR -->
    <v-toolbar fixed app>
      <v-toolbar-side-icon v-if="showNav" @click="toggleNav" />
      <v-btn flat to="/" active-class="">
        <v-img :src="imageBasePath + 'logo.png'" contain height="25" max-width="125px" />
      </v-btn>
      <v-toolbar-title class="hidden-sm-and-down text-xs-left" v-text="$t('common.label.app_name')" />
      <v-spacer />
      <!-- Environment -->
      <no-ssr>
        <busy />
      </no-ssr>
      <development v-if="environment === 'development'" />
      <v-menu
        v-if="haveTrackedTransactions"
        v-model="menuPendingTransactions"
        :close-on-content-click="false"
        offset-y
      >
        <v-btn slot="activator" icon>
          <v-icon>
            history
          </v-icon>
        </v-btn>
        <tracked-transactions />
      </v-menu>
      <help />
    </v-toolbar>

    <!-- MAIN CONTENT AREA -->
    <v-content>
      <security-challenge />
      <v-snackbar v-model="showNotification" :timeout="timeout" :top="true" :vertical="true" color="primary">
        {{ notification_message }}
        <v-btn flat @click="showNotification = false">
          Close
        </v-btn>
      </v-snackbar>
      <nuxt />
    </v-content>

    <v-dialog v-model="developmentAgreed" max-width="400px" persistent>
      <v-toolbar class="primary">
        <v-toolbar-title>
          {{ $t('development.label.development_release') }}
        </v-toolbar-title>
      </v-toolbar>
      <v-card>
        <v-card-text>
          {{ $t('development.message.development_release') }}
        </v-card-text>
        <v-card-actions>
          <v-btn class="primary" @click="developmentAgreed = true">
            {{ $t('common.action.accept') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogShowTermsConditions" persistent max-width="400px">
      <v-toolbar>
        <v-toolbar-title>
          {{ $t('eula.label.please_agree_continue') }}
        </v-toolbar-title>
      </v-toolbar>
      <v-card>
        <v-card-text>
          <p>
            {{ $t('eula.message.eula_message') }}
          </p>
        </v-card-text>
        <v-card-actions>
          <help show-category="terms_and_conditions">
            <v-btn flat @click="helpDialogShow = true">
              {{ $t('eula.action.show_eula') }}
            </v-btn>
          </help>
          <v-btn class="primary" @click="eulaAgreed = true">
            {{ $t('common.action.accept') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- FOOTER AREA -->
    <v-footer app height="auto" color="primary">
      <v-toolbar dense>
        <v-toolbar-title>
          &copy; {{ new Date().getFullYear() }} {{ $t('common.message.footer_text') }}
        </v-toolbar-title>
        <v-spacer />
        {{ version }}#{{ buildNumber }}
      </v-toolbar>
    </v-footer>
  </v-app>
</template>

<script>
import { mapActions } from 'vuex'
import Busy from '~/components/Busy'
import Development from '~/components/Development'
import Help from '~/components/Help'
import SecurityChallenge from '~/components/SecurityChallenge'
import TrackedTransactions from '~/components/TrackedTransactions'
import isElectron from 'is-electron'
import isOnline from 'is-online'
if (isElectron()) {
  // TODO Satisfy linter
  // const execFile = require('child_process').execFile
  // const remote = require('electron').remote
}

function initialDataState() {
  return {
    intervalApiRanking: false,
    intervalOnlineCheck: false,
    intervalWalletUpdate: false,
    dialogExit: false,
    minifyDrawer: false,
    drawerOpen: false,
    hydrated: false,
    navigationItems: [
      {
        icon: 'apps',
        key: 'dashboard',
        to: '/dashboard'
      },
      {
        icon: 'settings_system_daydream',
        key: 'wallet_management',
        to: '/wallet'
      },
      {
        icon: 'settings_ethernet',
        key: 'exchange',
        to: '/exchange'
      },
      {
        icon: 'settings_remote',
        key: 'aen',
        to: '/aen-blockchain'
      },
      {
        icon: 'contacts',
        key: 'address_book',
        to: '/address-book'
      }
    ],
    pendingTransactionsClicked: false,
    userMenu: false
  }
}

export default {
  /**
   * COMPONENTS
   */
  components: {
    Busy,
    Development,
    Help,
    SecurityChallenge,
    TrackedTransactions
  },
  /**
   * DATA
   */
  data() { return initialDataState() },
  /**
   * COMPUTED
   */
  computed: {
    imageBasePath() {
      return this.$g('internal.baseImagePath') },
      wallets() { return this.$store.state.wallet.wallets },
      local_version: {
          get() { return this.$store.state.runtime.migration_version },
          set(val) { this.$store.commit('RUNTIME_PROP', {key: 'migration_version', value: val} )}
      },

    helpDialogShow: {
      get: function () { return this.$store.state.user.help },
      set: function (val) { this.$store.commit('setUserProperty', {key: 'help', value: val}) }
    },

    cDrawerOpen: {
      get: function() {
        if (this.$vuetify.breakpoint.mdAndUp === true) {
          return true
        } else {
          return this.drawerOpen
        }
      },
      set: function (val) { this.drawerOpen = val }
    },
    developmentAgreed: {
      get() { return !this.$store.state.user.developmentAgreed },
      set(val) { this.$store.commit('USER_PROP', {key: "developmentAgreed", value: val }) }
    },
    menuPendingTransactions: {
      get() {
        if(this.haveTrackedTransactions === true && this.pendingTransactionsClicked === true) {
          return true
        } else {
          return false
        }
      },
      set(val) { this.pendingTransactionsClicked = val }
    },
    dialogShowTermsConditions() {
      if (['index','migrations'].includes(this.$nuxt.$route.name) === false && this.eulaAgreed === false) {
        return true
      }
      return false
    },
    haveTrackedTransactions() { return Object.keys(this.$store.state.wallet.trackedTransactions).length > 0 ? true : false },
    eulaAgreed: {
      get: function () { return this.$store.state.user.eulaAgree },
      set: function (val) { this.$store.commit('USER_PROP', {key: 'eulaAgree', value: val} )}
    },
    isOnline() { return this.$store.state.runtime.isOnline },
    buildNumber() { return this.$g('build_number') },
    version() { return this.$g('version') },
    appMode() { return this.$store.state.runtime.mode },
    environment() { return this.$store.state.runtime.environment },
    haveWallet() { return this.$store.state.wallet.aen.haveWallet },
    // Functionality enabled / disabled
    runningLocalNode: {
      get: function () { return this.$store.state.electron.runningLocalNode },
      set: function (value) {
        this.$store.commit('setElectronProperty', {
          key: 'runningLocalNode',
          value: value
        })
      }
    },
    showNav() {
          if (this.$nuxt.$route.name === 'migrations') {
              return false
          }
          return this.$store.state.user.eulaAgree
    },
    // notification details
    showNotification: {
      get: function () {
        return this.$store.state.notification.show
      },
      set: function (status) {
        this.$store.commit('setNotificationStatus', status)
      }
    },
    timeout() {
      return this.$store.state.notification.timeout
    },
    notification_type() {
      return this.$store.state.notification.type
    },
    notification_message() {
      return this.$store.state.notification.message
    }
  },
  /**
   *
   */
  async mounted() {

      // Are we on the migration page?
      if(this.$nuxt.$route.name !== 'migrations') {
          // TODO Once wallet has been running with migrate system for a while, remove the following line. It is used to cater for the early evangelists who ran wallets without
          if (this.$store.state.wallet.aen.mainAddress !== '' && this.$store.state.runtime.migration_version === '') {
              // Set migration version so that will find a match
              this.$store.commit('RUNTIME_PROP', {key: 'migration_version', value: 0})
          }

          if (this.$store.state.runtime.migration_version !== this.$g('migration_version')) {
              this.$nuxt.$router.replace({path: '/migrations'})
          }

          this.$log.debug('Running window startup routines')
          // Ensure some global variables are clean for start
          this.$store.commit('CACHE_SKIP', false)
          this.$store.commit('setAppMode', 'web')
          const env = process.env.NODE_ENV || 'dev'
          this.$store.commit('setRuntimeProperty', {key: 'environment', value: env})

          // If time intervals have not been set in the state yet
          if (Object.keys(this.$store.state.time_definitions).length === 0) {
              this.$store.commit('TIME_DEF', this.$g('time_definitions'))
          }

          // Determine how to handle main navigation by default depending on device size
          if (this.$vuetify.breakpoint.mdAndUp === true) {
              this.drawerOpen = true
              this.minifyDrawer = true
          } else {
              this.minifyDrawer = false
              this.drawerOpen = false
          }

          this.$store.commit('setLoading', {
              t: 'global',
              v: true,
              m: 'Page Startup'
          })
          this.$store.commit('BUSY', false)

          this.onlineCheck()
          if (process.client) {
            this.intervalOnlineCheck = setInterval(
              function () {
                this.onlineCheck()
              }.bind(this),
              this.$store.state.time_definitions.online_interval
            )
          }

          // Desktop app setup
          // if (isElectron()) {
          //   this.$store.commit('setAppMode', 'app')
          //   // Electron specific code
          //   console.log('P:Running from within Electron, checking if system services installed for running Chain Node')
          //   const child = execFile('docker', ['-v'], (error, stdout, stderr) => {
          //     if (error) {
          //       console.error('stderr', stderr)
          //       throw error
          //     }
          //     if (stdout.startsWith('Docker version')) {
          //       console.log('P:Docker can be controlled by Electron')
          //       this.$store.commit('setElectronProperty', { docker_present: true })
          //     }
          //   })
          //   console.log(child)
          // }

          // Check network settings and create a set of defaults based from first available
          // TODO Abstract this defaulting to a component of it's own which can pickup a "wallets available" setting
          this.$store.commit('wallet/setAenProperty', {
              key: 'activeApiEndpoint',
              value: this.$g('aen.api_endpoints')[0].address
          })
          this.$store.commit('wallet/setBtcProperty', {
              key: 'activeApiEndpoint',
              value: this.$g('btc.api_endpoints')[0].address
          })
          this.$store.commit('wallet/setEthProperty', {
              key: 'activeApiEndpoint',
              value: this.$g('eth.api_endpoints')[0].address
          })

          if (Object.keys(this.$store.state.wallet.aen.network).length === 0) {
              this.$store.commit('wallet/setAenProperty', {
                  key: 'network',
                  value: this.$g('aen.available_networks')[Object.keys(this.$g('aen.available_networks'))[0]]
              })
          }

          if (Object.keys(this.$store.state.wallet.btc.network).length === 0) {
              this.$store.commit('wallet/setBtcProperty', {
                  key: 'network',
                  value: this.$g('btc.available_networks')[Object.keys(this.$g('btc.available_networks'))[0]]
              })
          }

          if (Object.keys(this.$store.state.wallet.eth.network).length === 0) {
              this.$store.commit('wallet/setEthProperty', {
                  key: 'network',
                  value: this.$g('eth.available_networks')[Object.keys(this.$g('eth.available_networks'))[0]]
              })
          }

          this.rankApiNodes()
          if (process.client) {
            this.intervalApiRanking = setInterval(
              function () {
                this.rankApiNodes()
              }.bind(this),
              this.$store.state.time_definitions.api_ranking
            )
          }

          if (process.client) {
            this.intervalWalletUpdate = setInterval(() => {
              this.$store.dispatch('wallet/updateAll')
            }, this.$store.state.time_definitions.wallet_update)
          }

          // Set up some listeners to update balance of the wallets


          // Perform an initial investigation in to state of each network
          //   this.$store.dispatch('wallet/queryApiNode', 'aen')
          //   this.$store.dispatch('wallet/queryApiNode', 'btc')
          //   this.$store.dispatch('wallet/queryApiNode', 'eth')

          // TODO Update currency exchange rates from binance. Due to CORS restriction, investigate web account or use proxy
          // this.$store.dispatch('exchange/updateRates')

          this.$store.commit('setLoading', {t: 'global', v: false})
          if (this.$store.state.wallet.aen.mainAddress !== '') {
              this.$store.dispatch('security/addCheck', {
                  challenge: 'app_start',
                  address: this.$store.state.wallet.aen.mainAddress,
                  blocking: true
              })
          } else {
              if (this.$nuxt.$route.name !== 'index') {
                  this.$nuxt.$router.replace({path: '/'})
              } // End if on landing page
          } // End if have main AEN address
      } // End if on migration page
  },
  beforeDestroy() {
    clearInterval(this.intervalApiRanking)
    clearInterval(this.intervalOnlineCheck)
    clearInterval(this.intervalWalletUpdate)
  },
  methods: {
      ...mapActions({
          rankApiNodes: 'wallet/rankApiNodes'
      }),
    /**
     * Shutdown procedure
     */
    async onlineCheck() {
      const result = await isOnline()
      if(this.$store.state.runtime.isOnline !== result) {
        this.$store.commit('setRuntimeProperty', {
          key: 'isOnline',
          value: result
        })
      }
    },
    toggleNav() {
      if(this.$vuetify.breakpoint.mdAndUp === true) {
        this.minifyDrawer = !this.minifyDrawer
      } else {
        this.drawerOpen = !this.drawerOpen
      }

    },
    exit() {
      this.$log.debug('App is shutting down...')

      // Check if the user doesn't want to be remembered and reset the state machine
      if (this.$store.state.meta.rememberUser === false) {
        this.$store.commit('reset')
      }

      // If running the smart wallet as an app which has a window which can be closed
      // if (this.$store.state.meta.mode === 'app') {
      //   console.debug('E:Closing window')
      //   const window = remote.getCurrentWindow()
      //   window.close()
      // }
    }
  }
}
</script>
