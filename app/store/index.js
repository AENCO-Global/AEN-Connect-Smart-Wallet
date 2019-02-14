import {
  BlockchainHttp
} from 'chain-js-sdk'

export const initialState = {
  // Snackbar Controls
  notification: {
    show: false,
    type: 'success',
    message: 'message_placeholder',
    timeout: 6000
  },
  // High level app properties
  runtime: {
    mode: 'web',
    environment: 'production',
    isOnline: false,
    intervalTimers: {}
  },
  // When running as a desktop app
  electron: {
    dockerPresent: false,
    runningLocalNode: false
  },
  // State and stages of app status
  busy: {
    global: true,
    router: true,
    page: false,
    message: ''
  },
  // User options for security
  security: {

  },
  // Shared user preferences
  user: {
    rememberUser: false,
    eulaAgree: false,
    developmentAgreed: false,
    help: false
  }
}

export const state = () => (initialState)

export const getters = {
  notificationState: (state) => {
    return state.notification.show
  },
  booting: (state) => {
    return state.busy.global
  },
  environment: (state) => {
    return state.runtime.environment
  },
  busy: (state) => {
    return state.busy.page
  },
  loading: (state) => {
    if (
      state.busy.global === true ||
            state.busy.router === true) {
      return true
    }
  }
}

export const actions = {
  /**
     * Gets some generic (non wallet specific) related blockchain information
     *
     * @param {*} context
     */
  updateGenericNetworkInformation(context) {
    console.debug('Index Store: Update Generic Network Information')
    const apiEndpoint = context.state.wallet.aen.activeApiEndpoint
    if (!apiEndpoint) {
      return
    }
    const blockchainHttp = new BlockchainHttp(apiEndpoint)
    // Get the network height
    blockchainHttp.getBlockchainHeight()
      .subscribe((height) => {
        if (height.lower !== context.state.wallet.aen.blockHeight) {
          context.commit('wallet/setAenProperty', {
            key: 'blockHeight',
            value: height.lower
          })
        }
      })
    // Get current blockchain score
    blockchainHttp.getBlockchainScore()
      .subscribe((score) => {
        if (score.scoreLow.lower !== context.state.wallet.aen.blockScore) {
          context.commit('wallet/setAenProperty', {
            key: 'blockScore',
            value: score.scoreLow.lower
          })
        }
      })
  }
}

export const mutations = {
  reset(state) {
    Object.assign(state, initialState)
  },
  setAccountStatus(state, status) {
    state.meta.wallet_present = status
  },
  setEnvironment(state, environmentName) {
    state.meta.environment = environmentName
  },
  setElectronProperty(state, options) {
    state.electron[options.key] = options.value
  },
  setInternalProperty(state, options) {
    state.internal[options.key] = options.value
  },
  setRuntimeProperty(state, options) {
    state.runtime[options.key] = options.value
  },
  setUserProperty(state, options) {
    state.user[options.key] = options.value
  },
  setMeta(state, options) {
    state.meta[options.key] = options.value
  },
  addWallet(state, wallet) {
    // if (!state.wallets.hasOwnProperty(wallet.address)) {
    state.wallets[wallet.address] = wallet
    // }
  },
  // Setting a AEN wallet to main context
  setActiveWallet(state, wallet) {
    state.meta.walletPresent = true
    state.activeWallet.privateKey = wallet.privateKey
    state.activeWallet.address = wallet.address

    // Check whether the wallet exists in
    // if (!state.wallets.hasOwnProperty(state.activeWallet.address)) {
    state.wallets[state.activeWallet.address] = wallet
    // }
  },
  setAccount(state, account) {
    state.activeWallet.public_key = account.publicKey
    state.activeWallet.private_key = account.privateKey
  },
  setPassword(state, password) {
    state.activeWallet.password = password
  },
  setRememberUser(state, value) {
    state.meta.rememberUser = value
  },
  /**
     * t = type
     * v = boolean conditions
     * m = message
     * @param {*} state
     * @param {*} loadingObject
     */
  setLoading(state, loadingObject) {
    state.busy[loadingObject.t] = loadingObject.v
    if (loadingObject.hasOwnProperty('m')) {
      state.busy.message = loadingObject.m
    }
  },
  setRouterLoading(state, value) {
    state.internal.router_loading = value
  },
  /**
     * Address Book related information
     */
  addContact(state, contact) {
    state.contacts.push(contact)
  },
  deleteContact(state, contact) {
    const indexPosition = state.contacts.findIndex(i => i === contact)
    state.contacts.splice(indexPosition, 1)
  },
  editContact(state, changeObjects) {
    const indexPosition = state.contacts.findIndex(i => i === changeObjects.original)
    state.contacts.splice(indexPosition, 1)
    state.contacts.push(changeObjects.updated)
  },
  setApiEndpoint(state, value) {
    state.internal.activeApiEndpoint = value
  },
  setPingTime(state, value) {
    state.internal.activeApiPing = value
  },
  setPreferredNode(state, address) {
    state.internal.preferredNode = address
  },
  setActiveNodeList(state, nodeList) {
    state.internal.nodeList = nodeList
  },
  setNetwork(state, network) {
    state.activeWallet.network = network
  },
  setBlockHeight(state, blockHeight) {
    state.internal.block_height = blockHeight
  },
  setBlockScore(state, blockScore) {
    state.internal.block_score = blockScore
  },
  dismissNotification(state) {
    state.notification.show = false
  },
  showNotification(state, inputObject) {
    inputObject.show = true
    state.notification = inputObject
  },
  setIncomingTransactions(state, transactions) {
    state.transactions.incoming = transactions
  },
  setUnconfirmedTransactions(state, transactions) {
    state.transactions.unconfirmed = transactions
  },
  setOutgoingTransactions(state, transactions) {
    state.transactions.outgoing = transactions
  },
  setNotificationStatus(state, status) {
    state.notification.show = status
  },
  setDeviceSetting(state, input) {
    state.settings[input.key] = input.value
  },
  setAccountProperty(state, input) {
    state.activeWallet[input.key] = input.value
  },
  setMosaics(state, input) {
    state.mosaics = input
  },
  setAppMode(state, mode) {
    state.runtime.mode = mode
  }
}
