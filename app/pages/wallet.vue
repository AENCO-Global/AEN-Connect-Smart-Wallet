<template>
  <v-container :class="{'pa-0': $vuetify.breakpoint.smAndDown}">
    <v-layout row justify-center align-center>
      <v-flex xs12>
        <v-toolbar class="primary mb-2">
          <v-toolbar-title>
            {{ $t('common.navigation.wallet_management') }}
          </v-toolbar-title>
          <v-spacer />
          <template v-if="$vuetify.breakpoint.mdAndUp">
            <backup-wallet :show-icon="true" />
            <v-menu offset-y>
              <v-btn slot="activator" color="success">
                <v-icon>add</v-icon>{{ $t('wallet.action.add') }}
              </v-btn>
              <v-list>
                <v-list-tile @click="walletType = 'aen'; dialogWalletAdd = true">
                  <v-list-tile-title>{{ $t('network.label.aen') }}</v-list-tile-title>
                </v-list-tile>
                <v-list-tile @click="walletType = 'eth'; dialogWalletAdd = true">
                  <v-list-tile-title>{{ $t('network.label.eth') }}</v-list-tile-title>
                </v-list-tile>
                <v-list-tile @click="walletType = 'btc'; dialogWalletAdd = true">
                  <v-list-tile-title>{{ $t('network.label.btc') }}</v-list-tile-title>
                </v-list-tile>
                <v-list-tile v-if="haveEthereumWallet" @click="walletType = 'contract'; dialogWalletAdd = true">
                  <v-list-tile-title>{{ $t('network.contract') }}</v-list-tile-title>
                </v-list-tile>
              </v-list>
            </v-menu>
          </template>
          <!--:close-on-click="false"-->
          <v-menu v-else offset-y :close-on-content-click="false">
            <v-btn
              slot="activator"
              small
              outline
            >
              <v-icon>
                menu
              </v-icon>
              {{ $t('common.label.options') }}
            </v-btn>
            <v-list>
              <v-list>
                <backup-wallet :show-icon="true" />
                <v-divider />
                <v-subheader>Add Wallet</v-subheader>
                <v-list-tile @click="walletType = 'aen'; dialogWalletAdd = true">
                  <v-list-tile-title>{{ $t('network.label.aen') }}</v-list-tile-title>
                </v-list-tile>
                <v-list-tile @click="walletType = 'eth'; dialogWalletAdd = true">
                  <v-list-tile-title>{{ $t('network.label.eth') }}</v-list-tile-title>
                </v-list-tile>
                <v-list-tile @click="walletType = 'btc'; dialogWalletAdd = true">
                  <v-list-tile-title>{{ $t('network.label.btc') }}</v-list-tile-title>
                </v-list-tile>
                <v-list-tile v-if="haveEthereumWallet" @click="walletType = 'contract'; dialogWalletAdd = true">
                  <v-list-tile-title>{{ $t('network.contract') }}</v-list-tile-title>
                </v-list-tile>
              </v-list>
            </v-list>
          </v-menu>
        </v-toolbar>
        <!-- Wallet Management -->
        <v-card class="apply-active-expansion">
          <v-card-text v-if="haveWallet" :class="{'pa-0': $vuetify.breakpoint.smAndDown}">
            <v-layout row wrap>
              <v-flex xs12>
                <v-expansion-panel>
                  <v-expansion-panel-content v-for="(wallet, address) in wallets" :key="address">
                    <!-- Main Table Row -->
                    <div slot="header" @click="accordionTogglingWallet(wallet)">
                      <v-layout row wrap>
                        <v-flex xs3 md1 class="text-xs-left">
                          <wallet-image :wallet="wallet" />
                        </v-flex>
                        <v-flex xs7 md4 class="text-truncate">
                          <v-layout row wrap>
                            <v-flex xs12 sm6>
                              {{ wallet.name }}
                              <p v-if="testNet(wallet)" class="testnet">
                                {{ $t('development.label.testnet') }}
                              </p>
                            </v-flex>
                            <v-flex xs12 sm6>
                              <balance :wallet="wallet" />
                            </v-flex>
                          </v-layout>
                        </v-flex>
                        <!-- Wallet Controls -->
                        <v-flex v-if="$vuetify.breakpoint.mdAndUp" xs2 md7 class="text-xs-right">
                          <refresh-wallet :wallet="wallet" />
                          <v-btn :disabled="wallet.onChain === false || wallet.type === 'btc'" outline small @click="sendShow(wallet, $event)">
                            {{ $t('common.action.send') }}
                          </v-btn>
                          <v-btn outline small @click="addressShow(wallet)">
                            {{ $t('common.action.receive') }}
                          </v-btn>
                          <v-btn outline small @click="editShow(wallet, $event)">
                            {{ $t('common.label.options') }}
                          </v-btn>
                        </v-flex>
                      </v-layout>
                    </div>
                    <!-- Wallet expansion details. Only try to render the section if selected to avoid unnecessary proc -->
                    <v-card v-if="selectedWalletAddress == address">
                      <v-card-text>
                        <v-layout row wrap>
                          <v-flex xs12 md6>
                            <address-render :address="wallet.address" :use-address-book="false" :wide="true" />
                          </v-flex>
                          <v-flex v-if="$vuetify.breakpoint.mdAndUp" md6>
                            <testnet-buttons :wallet="wallet" />
                          </v-flex>
                          <v-flex v-if="$vuetify.breakpoint.smAndDown" xs4>
                            <v-btn :disabled="wallet.onChain === false || wallet.type === 'btc'" outline small block @click="sendShow(wallet, $event)">
                              {{ $t('common.action.send') }}
                            </v-btn>
                          </v-flex>
                          <v-flex v-if="$vuetify.breakpoint.smAndDown" xs4>
                            <v-btn outline small block @click="addressShow(wallet)">
                              {{ $t('common.action.receive') }}
                            </v-btn>
                          </v-flex>
                          <v-flex v-if="$vuetify.breakpoint.smAndDown" xs4>
                            <v-btn outline small block @click="editShow(wallet, $event)">
                              {{ $t('common.label.options') }}
                            </v-btn>
                          </v-flex>
                          <v-flex xs12>
                            <tracked-transactions :wallet="wallet" />
                            <wallet-history v-if="wallet.onChain === true" :wallet="wallet" />
                            <activation v-else :wallet="wallet" />
                          </v-flex>
                        </v-layout>
                      </v-card-text>
                    </v-card>
                  </v-expansion-panel-content>
                </v-expansion-panel>
              </v-flex>
            </v-layout>
          </v-card-text>
          <v-card-text v-else>
            <v-alert outline type="info" :value="true">
              {{ $t('common.message.results_empty') }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-flex>

      <!-- Show Address Dialog -->
      <v-dialog v-if="dialogAddressShow === true" v-model="dialogAddressShow" max-width="500px">
        <v-toolbar class="primary">
          <v-toolbar-title>{{ contextWallet.name }}</v-toolbar-title>
          <v-spacer />
          <v-btn small icon outline @click="dialogAddressShow = false">
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <business-card :wallet="contextWallet" :use-address-book="false" :include-private-key="true" />
      </v-dialog>

      <!-- Edit Wallet Dialog -->
      <v-dialog v-if="dialogEditWallet === true" v-model="dialogEditWallet" max-width="500px">
        <v-toolbar class="primary">
          <v-toolbar-title>{{ contextWallet.name }}</v-toolbar-title>
          <v-spacer />
          <v-btn small icon outline @click="dialogEditWallet = false">
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-tabs>
          <v-tab>
            Edit
          </v-tab>
          <v-tab-item>
            <v-card flat>
              <v-card-text>
                <v-layout row wrap>
                  <v-flex v-if="$vuetify.breakpoint.smAndDown" xs6>
                    <refresh-wallet v-if="$vuetify.breakpoint.smAndDown" :wallet="contextWallet" />
                  </v-flex>
                  <v-flex v-if="$vuetify.breakpoint.smAndDown" xs6>
                    <testnet-buttons :wallet="contextWallet" />
                  </v-flex>
                  <v-flex v-if="canBePrimary()" xs12>
                    <v-btn @click="makeWalletPrimary">
                      Set as Primary Wallet
                    </v-btn>
                  </v-flex>
                  <v-flex xs12>
                    <v-text-field
                      v-model="modelWalletName"
                      :label="$t('common.label.name')"
                      @keyup.enter="dialogEditWallet = false"
                    />
                  </v-flex>
                  <v-flex xs12>
                    <!-- The details are written straight in to the model so, simply close the dialog box -->
                    <!-- TODO When adding more wallet customisation features, edit the way information is save -->
                    <v-btn color="primary" @click="dialogEditWallet = false">
                      {{ $t('common.action.save') }}
                    </v-btn>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-tab-item>

          <v-tab v-if="contextWallet.address !== mainWalletAddress">
            {{ $t('common.action.remove') }}
          </v-tab>
          <v-tab-item>
            <v-card flat>
              <v-card-text>
                <v-layout row wrap>
                  <v-flex xs12>
                    {{ $t('wallet.message.remove_warning') }}
                  </v-flex>
                  <v-flex xs12>
                    <v-text-field
                      v-model="confirmedWalletName"
                      :label="$t('common.label.name')"
                    />
                  </v-flex>
                  <v-flex xs12>
                    <!-- The details are written straight in to the model so, simply close the dialog box -->
                    <!-- TODO When adding more wallet customisation features, edit the way information is save -->
                    <v-btn color="warning" :disabled="deleteDisabled" @click="removeWallet">
                      {{ $t('common.action.remove') }}
                    </v-btn>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-tab-item>
        </v-tabs>
      </v-dialog>

      <!-- New Wallet Dialog -->
      <v-dialog v-if="dialogWalletAdd === true" v-model="dialogWalletAdd" persistent max-width="650px">
        <v-toolbar color="primary">
          <v-toolbar-title>{{ $t('wallet.action.add') }}</v-toolbar-title>

          <v-spacer />
          <v-btn icon @click="dialogWalletAdd = false">
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card>
          <v-card-text>
            <wallet-add :type="walletType" @complete="walletAdded()" />
          </v-card-text>
        </v-card>
      </v-dialog>

      <!-- Make Transfer Dialog -->
      <v-dialog v-if="dialogMakeTransfer === true" v-model="dialogMakeTransfer" persistent max-width="450px">
        <v-toolbar color="primary">
          <v-toolbar-title>{{ $t('wallet.label.transfer_from') }}{{ contextWallet.name }}</v-toolbar-title>
          <v-spacer />
          <v-btn small icon outline @click="dialogMakeTransfer = false">
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <make-transfer :wallet="contextWallet" @complete="transferComplete()" />
      </v-dialog>
    </v-layout>
  </v-container>
</template>

<style>
  .apply-active-expansion .v-expansion-panel__container--active .v-expansion-panel__header,
  .apply-active-expansion .v-expansion-panel__container--active .v-card__text,
  .apply-active-expansion .v-expansion-panel__container--active .v-table,
  .apply-active-expansion .v-expansion-panel__container--active .v-datatable__actions {
    background-color: var(--primary-dark-1) !important;
  }
  .testnet {
    font-size: 0.6rem;
    color: #b5b5b5;
    text-transform: uppercase;
  }

  .mobile .v-expansion-panel__header {
    padding: 0 !important;
  }

</style>
<script>
import Activation from '~/components/Activation'
import Balance from '~/components/Balance'
import BackupWallet from '~/components/BackupWallet'
import RefreshWallet from '~/components/RefreshWallet'
import TrackedTransactions from '~/components/TrackedTransactions'
// import VueRecaptcha from 'vue-recaptcha'
import WalletHistory from '~/components/WalletHistory'
import MakeTransfer from '~/components/MakeTransfer'
import TestnetButtons from '~/components/TestnetButtons'
import WalletAdd from '~/components/WalletAdd'

function initialDataState() {
  return {
    pageLoadInterval: null,
    accordionOpen: false,
    dialogWalletAdd: false,
    dialogWalletView: false,
    dialogMakeTransfer: false,
    dialogReceiveTransfer: false,
    dialogRemoveWallet: false,
    dialogAddressShow: false,
    dialogEditWallet: false,
    activeWatchers: [],
    confirmedWalletName: '',
    walletType: null,
    valid: false,
    backupAgree: false,
    newAccount: false,
    menuMobile: false,
    existingAccount: false,
    mobileWalletMenu: false,
    walletCreated: false,
    selectedWalletAddress: null,
    showPassword: false,
    walletName: '',
    walletPassword: '',
    contextWallet: null,
    accordionControlMap: [],
    accordionControlling: false,
    accordionCurrentPosition: 0,
    x: 0,
    y: 0,
    rules: {
      required: value => !!value || 'Required.'
    },
    walletRules: {
      required: value => !!value || 'Required.',
      min: v => v.length >= 6 || 'Min 6 Characters'
    },
    passwordRules: {
      required: value => !!value || 'Required.',
      min: v => v.length >= 8 || 'Min 8 characters'
    },
    validity: {}
  }
}
export default {
  components: {
    Activation,
    BackupWallet,
    Balance,
    MakeTransfer,
    RefreshWallet,
    TestnetButtons,
    TrackedTransactions,
    WalletAdd,
    WalletHistory
  },
  data() { return initialDataState() },
  head() {
    return {
      title: 'AENConnect Smart Wallet - Wallet Management',
      meta: [
        { hid: 'description', name: 'description', content: 'Manage your various wallets and make transfers' }
      ]
    }
  },
  computed: {
    deleteDisabled() { return this.contextWallet.name !== this.confirmedWalletName ? true : false },
    modelWalletName: {
      get() { if(this.contextWallet) { return this.contextWallet.name } else { return '' } },
      set(val) { this.$store.commit('wallet/setWalletProperty', {
        address: this.contextWallet.address, key: 'name', value: val
      }) }
    },
    mainWalletAddress() { return this.$store.state.wallet.aen.mainAddress },
    environment() {
      return this.$store.state.runtime.environment
    },
    haveEthereumWallet() {
      return this.$store.getters["wallet/haveWalletType"]('ethereum')
    },
    wallets() {
      return this.$store.state.wallet.wallets
    },
    haveWallet() {
      return (Object.keys(this.wallets).length > 0 ? true : false)
    },
    multipleNetworks() {
      if (this.$g('aen.available_networks').length > 1) {
        return true
      }
      return false
    }
  },
  mounted: function () {
    // Only start once global loading finished
    if (process.client) {
      this.pageLoadInterval = setInterval(
        function () {
          this.$store.dispatch('wallet/updateAll')
          // Create a wallet index map to control accordion with
          clearInterval(this.pageLoadInterval)
          this.$store.commit('setLoading', { t: 'router', v: false })
        }.bind(this),
        this.$store.state.time_definitions.controller_poll
      )
    }
  },
  beforeDestroy() {
    clearInterval(this.pageLoadInterval)
  },
  methods: {
      canBePrimary() {
          return (
              this.contextWallet.type === 'aen' &&
              this.contextWallet.address !== this.$store.state.wallet.aen.mainAddress
          ) ? true : false
      },
      makeWalletPrimary() {
          this.$store.commit('wallet/AEN_PROP', {key: 'mainAddress', value: this.contextWallet.address })
      },

    testNet(wallet) {
      // First check whether the wallet is a contract and using parent
      if(wallet.hasOwnProperty('managerWalletAddress')) {
        wallet = this.$store.state.wallet.wallets[wallet.managerWalletAddress]
      }

      if(wallet.hasOwnProperty('network')) {
        if (wallet.network.hasOwnProperty('testing')) {
          return true
        }
      }
      return false
    },
    dialogEditWalletClick(event) {
      event.stopPropagation()
      this.dialogEditWallet = true;
    },
    trackedTransactions(wallet) {
      const transactions = this.$store.getters['wallet/trackedTransactionsByWallet'](wallet)
      return transactions
    },
    unconfirmedTransactions(wallet, event) {
      event.stopPropagation()
      this.$store.dispatch('wallet/transactionsPending', wallet)
    },
    accordionTogglingWallet(wallet) {

      // TODO Make this code simpler, shame on me xD
      if(!this.selectedWalletAddress) { this.accordionOpen = true }
      if(this.selectedWalletAddress === wallet.address && this.accordionOpen === true) {
        this.accordionOpen = false
      } else {
        this.accordionOpen = true
      }

      this.contextWallet = wallet
      this.selectedWalletAddress = wallet.address

      // Update the wallet on demand
      if(this.contextWallet.onChain ) {
        this.$store.dispatch('wallet/balance', wallet)
        this.$store.dispatch('wallet/transactionsHistorical', wallet)
      } else {
        this.$store.dispatch('wallet/getLiveWallet', wallet).then((walletOnChain) => {
          if (walletOnChain !== false) {
            this.$store.commit('wallet/WALLET_PROP', {
              address: wallet.address,
              key: 'onChain',
              value: true
            })
          }
        })
      }
      this.dialogWalletView = true
    },
    addressShow(wallet) {
      this.contextWallet = wallet
      this.dialogAddressShow = true
    },
    removeWallet() {
      this.dialogRemoveWallet = false
      this.walletView = false
      this.$store.commit('wallet/removeWallet', this.contextWallet)
      this.$store.commit('showNotification', {
        type: 'success',
        message: this.$t('common.message.removed')
      })
      this.dialogEditWallet = false
    },
    mobileMenuShow(event) {
      event.stopPropagation()
      this.x = event.clientX
      this.y = event.clientY
      this.menuMobile = true
    },
    editShow(wallet, event) {
      event.stopPropagation()
      this.contextWallet = wallet
      this.dialogEditWallet = true
    },
    sendShow(wallet, event) {
      event.stopPropagation()
      this.contextWallet = wallet
      this.dialogMakeTransfer = true
    },
    walletAdded() {
      this.dialogWalletAdd = false
      this.$store.commit('showNotification', {
        type: 'success',
        message: this.$t('wallet.message.add_success')
      })
    },
    transferComplete() {
      this.dialogMakeTransfer = false
    }
  }
}
</script>
