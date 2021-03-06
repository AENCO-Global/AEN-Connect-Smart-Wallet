import Vue from 'vue'
import $g from '~/globals.json'
import Aen from '~/class/network/Aen'
import Btc from '~/class/network/Btc'
import Contract from '~/class/network/Contract'
import Eth from '~/class/network/Eth'
// import {format} from "date-fns";
// import ContractDataDecoder from 'ethereum-input-data-decoder'
export const initialState = {
  contacts: {},
  wallets: {},
  trackedTransactions: {},
  aen: {
    walletCount: 1,
    mainAddress: '',
    activeApiEndpoint: '',
    apiPing: 9999,
    blockHeight: 0,
    blockScore: 0,
    network: {},
    displaySymbol: $g.exchange.base_denomination.aen
  },
  btc: {
    walletCount: 1,
    activeApiEndpoint: '',
    apiPing: 9999,
    network: {},
    displaySymbol: $g.exchange.base_denomination.btc
  },
  eth: {
    walletCount: 1,
    activeApiEndpoint: '',
    apiPing: 9999,
    network: {},
    displaySymbol: $g.exchange.base_denomination.eth
  },
  internal: {
    walletCheckInterval: 10000,
    apiEndpointPingInterval: 30000,
    networkInformationInterval: 30000
  }
}

export const state = () => initialState

export const getters = {
  getByName: (state) => (walletName) => {
    for (let walletAddress in state.wallets) {
      if(state.wallets[walletAddress].name === walletName) {
        return state.wallets[walletAddress]
      }
    }
    return false
  },
  // TODO Move the contact handling to a store of it's own
  /**
   * Get a contact by the display name
   *
   * @param state
   * @returns {Function}
   */
  contactByProperty: (state) => (options) => {
    for (let contact in state.contacts) {
      if(state.contacts[contact][options.property] === options.value) {
        return state.contacts[contact]
      }
    }
    return false
  },
  /**
   * Get all available contacts pertinent to a wallet
   *
   * @param state
   * @returns {function(*): Array}
   */
  contactsByWallet: (state) => (wallet) => {
    let contacts = []
    for (let contactIndex in state.contacts) {
      let contact = state.contacts[contactIndex]
      if(contact.type === wallet.type && wallet.address !== contactIndex) {
        contacts.push(contact)
      }
    }
    return contacts
  },
  trackedTransactionsByWallet: (state) => (wallet) => {
    let transactions = []
    for (let transactionIndex in state.trackedTransactions) {
      if(state.trackedTransactions[transactionIndex].address === wallet.address) {
        transactions.push(state.trackedTransactions[transactionIndex])
      }
    }
    return transactions
  },
  networkHandler: (state) => (options) => {
    let apiEndpoint, type
    if(typeof options === 'object') {
      type = options.type
    } else {
      type = options
      // Set up dummy options object
      options = {network: ""}
    }

    switch (type) {
      case 'aen':
        return new Aen(
            state.aen.activeApiEndpoint,
            Vue.prototype.$g('aen')
        )
      case 'btc':
        return new Btc(state.btc.activeApiEndpoint, Vue.prototype.$g('btc'))
      case 'contract':
        apiEndpoint = state.eth.activeApiEndpoint
          .replace('###NETWORK_IDENTIFIER###', options.network)
        return new Contract(apiEndpoint, Vue.prototype.$g('eth'))
      case 'eth':
        apiEndpoint = state.eth.activeApiEndpoint
          .replace('###NETWORK_IDENTIFIER###', options.network)
        return new Eth(apiEndpoint, Vue.prototype.$g('eth'))
    }
  },
  walletsByType: (state) => (type) => {
    let wallets = []
    for (const wallet in state.wallets) {
      if (state.wallets[wallet].type === type) {
        wallets.push(state.wallets[wallet])
      }
    }
    return wallets
  },
  haveWalletType: (state) => (type) => {
    for (const wallet in state.wallets) {
      if (state.wallets[wallet].type === type) {
        return true
      }
    }
    return false
  }
}

// function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

export const actions = {
  balance: ({state, commit, dispatch, getters, rootState}, wallet) => {
    let networkHandler, parentWallet
    // There are cases where this is actually undefined so perform a quick check before trying to proceed
    if(typeof this !== 'undefined') {
      if(this.hasOwnProperty('app')) {
        dispatch('busy', this.app.i18n.t('wallet.message.updating_balance'), {root: true})
      }
    }
    return new Promise((resolve, reject) => {
      // Use cache if offline or wallet not yet recognised on network
      if(rootState.runtime.isOnline === false || wallet.onChain === false) {
        dispatch('busy', false, { root: true })
        resolve(wallet)
      }
      // Use cache if function called to recently
      if((Date.now() - wallet.balanceLastSynced) < rootState.time_definitions.wallet_update) {
        if(rootState.runtime.skipCacheNextOp === true) {
          commit('CACHE_SKIP', false, { root: true})
        } else {
          dispatch('busy', false, { root: true })
          resolve(wallet)
          return
        }
      }
      // Set the page loader going


      switch (wallet.type) {
        case 'aen':
          networkHandler = getters['networkHandler']('aen')
          networkHandler
              .balance(wallet)
              .then((response) => {

                Vue.$log.debug('got the balance for AEN wallet', wallet, response)
                commit('setWalletProperty', {
                  address: wallet.address,
                  key: 'balance',
                  value: response
                })
                commit('setWalletProperty', {
                  address: wallet.address,
                  key: 'balanceLastSynced',
                  value: Date.now()
                })
                resolve(wallet)
              })
              .catch((err) => {
                reject(err)
              })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
        case 'btc':
          resolve(wallet)
          // TODO For this active API endpoint, mixin network selection
          networkHandler = getters['networkHandler']('btc')
          networkHandler
              .balance(wallet)
              .then((response) => {
                commit('setWalletProperty', {
                  address: wallet.address,
                  key: 'balance',
                  value: response
                })
                commit('setWalletProperty', {
                  address: wallet.address,
                  key: 'balanceLastSynced',
                  value: Date.now()
                })
                resolve(wallet)
              })
              .catch((err) => {
                reject(err)
              })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
        case 'contract':
          parentWallet = state.wallets[wallet.managerWalletAddress]
          networkHandler = getters['networkHandler'](
            { type: 'contract', network: $g.eth.available_networks[parentWallet.network].identifier })
          networkHandler
              .balance(wallet)
              .then((response) => {
                commit('setWalletProperty', {
                  address: wallet.address,
                  key: 'balance',
                  value: response
                })
                commit('setWalletProperty', {
                  address: wallet.address,
                  key: 'balanceLastSynced',
                  value: Date.now()
                })
                resolve(wallet)
              })
              .catch((err) => {
                reject(err)
              })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
        case 'eth':
          networkHandler = getters['networkHandler'](
            { type: 'eth', network: $g.eth.available_networks[wallet.network].identifier })
          networkHandler
              .balance(wallet)
              .then((response) => {
                commit('setWalletProperty', {
                  address: wallet.address,
                  key: 'balance',
                  value: response
                })
                commit('setWalletProperty', {
                  address: wallet.address,
                  key: 'balanceLastSynced',
                  value: Date.now()
                })
                resolve(wallet)
              })
              .catch((err) => {
                reject(err)
              })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
      }

    })
  },
  transactionsHistorical({state, commit, dispatch, getters, rootState}, wallet) {
    var networkHandler
    return new Promise((resolve) => {
      // Use cache if offline or wallet not yet recognised on network

      if(rootState.runtime.isOnline === false || (wallet.hasOwnProperty('onChain') && wallet.onChain === false)) {
        resolve(wallet)
      }
      // Use cache if function called to recently
      if((Date.now() - wallet.transactionsLastSynced) < rootState.time_definitions.wallet_update) {
        if(rootState.runtime.skipCacheNextOp === true) {
          commit('CACHE_SKIP', false, { root: true})
        } else {
          resolve(wallet)
          return
        }
      }

      // There are cases where this is actually undefined so perform a quick check before trying to proceed
      if(typeof this !== 'undefined') {
        if(this.hasOwnProperty('app')) {
          dispatch('busy', this.app.i18n.t('wallet.message.updating_history'), {root: true})
        }
      }
      switch (wallet.type) {
        case 'aen':
          networkHandler = getters['networkHandler']('aen')
          // Do behind the scenes work
          networkHandler.transactionsHistorical(wallet).then((headTransactions) => {
            // Create a new transaction array
            const transactions = Object.assign({}, wallet.transactions, headTransactions)
            commit('setWalletProperty', {
              address: wallet.address,
              key: 'transactions',
              value: transactions
            })
            commit('setWalletProperty', {
              address: wallet.address,
              key: 'transactionsLastSynced',
              value: Date.now()
            })
            dispatch('busy', false, { root: true })
            resolve(wallet)
          })
          break
        case 'btc':
          // TODO For this active API endpoint, mixin network selection
          networkHandler = getters['networkHandler']('btc')
          // Do behind the scenes work
          networkHandler.transactionsHistorical(wallet).then((headTransactions) => {

            const mnemonic = this.getters['security/secureProperty']({
              key: 'mnemonic',
              address: wallet.address
            })

            // TODO WORKING FROM HERE
            // Check if any of the transactions are incoming in order to push the BIP index forward
            for(let key in headTransactions) {
              let transaction = headTransactions[key]
              if(transaction.tx_input_n === -1) {
                networkHandler.transactionInfo({
                  hash: transaction.tx_hash,
                  network: wallet.network
                }).then((transactionInformation) => {
                  // If one of the output addresses matches the current BIP index, move it forward
                  if(transactionInformation.addresses.includes(wallet.receiverAddress)) {
                    const managedAddressesWithTokens = Object.assign({}, wallet.managedAddressesWithTokens)
                    managedAddressesWithTokens[wallet.address] = 0
                    commit('setWalletProperty', {
                      address: wallet.address,
                      key: 'managedAddressesWithTokens',
                      value: managedAddressesWithTokens
                    })
                    // Generate the next BIP address for receiving
                    commit('setWalletProperty', {
                      address: wallet.address,
                      key: 'currentBipIndex',
                      value: (wallet.currentBipIndex + 1)
                    })
                    networkHandler.receieverAddress(
                        {
                          wallet: wallet,
                          mnemonic: mnemonic
                        }
                    ).then((address) => {
                      commit('setWalletProperty', {
                        address: wallet.address,
                        key: 'receiverAddress',
                        value: address
                      })
                    })
                  }
                })
              }
            }
            // Create a new transaction array
            const transactions = Object.assign({}, wallet.transactions, headTransactions)

            commit('setWalletProperty', {
              address: wallet.address,
              key: 'transactions',
              value: transactions
            })
            commit('setWalletProperty', {
              address: wallet.address,
              key: 'transactionsLastSynced',
              value: Date.now()
            })
            dispatch('busy', false, { root: true })
            resolve(wallet)
          })

          break
        case 'contract':
          networkHandler = getters['networkHandler'](
            { type: 'contract', network: state.wallets[wallet.managerWalletAddress].network.identifier })
            // Create a new transaction array
            // TODO Actually refresh the original wallet
            dispatch('busy', false, { root: true })
            resolve(wallet)
          break
        case 'eth':
          networkHandler = getters['networkHandler'](
            { type: 'eth', network: $g.eth.available_networks[wallet.network].identifier })
          networkHandler.transactionsHistorical(wallet).then(async (headTransactions) => {

            if(Object.keys(headTransactions.contract).length > 0) {
              // Write any contract details
              let contractAddress, contractInfo
              for (contractAddress in headTransactions.contract) {

                // Get the first contract transaction to use as definition
                contractInfo = headTransactions.contract[contractAddress][Object.keys(headTransactions.contract[contractAddress])[0]]

                if (!state.wallets.hasOwnProperty(contractAddress)) {
                  let walletOptions = {
                    type: 'contract',
                    address: contractAddress.toLowerCase(),
                    network: wallet.network,
                    onChain: true,
                    managerWalletAddress: wallet.address.toLowerCase(),
                    name: contractInfo.contractName,
                    decimals: contractInfo.decimals,
                    symbol: contractInfo.symbol,
                    transactionsLastSynced: Date.now(),
                    transactions: headTransactions.contract[contractAddress]
                  }
                  dispatch('load', walletOptions)
                      .then((wallet) => {
                        commit('showNotification', {
                          type: 'success',
                          message: Vue.prototype.$t('wallet.message.contract_added') + ': ' + wallet.name
                        })
                      })
                }
              }
            }

            // Create a new transaction array
            commit('setWalletProperty', {
              address: wallet.address,
              key: 'transactions',
              value: Object.assign({}, wallet.transactions, headTransactions.origin)
            })
            commit('setWalletProperty', {
              address: wallet.address,
              key: 'transactionsLastSynced',
              value: Date.now()
            })

            // Update the current block number so that future transaction lookups aren't duplicated
            networkHandler.getHeight().then((blockHeight) => {
              commit('setWalletProperty', {
                address: wallet.address,
                key: 'startBlock',
                value: blockHeight
              })
            })

            dispatch('busy', false, { root: true })
            resolve(wallet)
          })
          break
      }
    })
  },
  getLiveWallet({dispatch, getters, state }, wallet) {
    let networkHandler, parentWallet
    return new Promise((resolve) => {
      // There are cases where this is actually undefined so perform a quick check before trying to proceed
      if(typeof this !== 'undefined') {
        if(this.hasOwnProperty('app')) {
          dispatch('busy', this.app.i18n.t('wallet.message.checking_wallet_status'), {root: true})
        }
      }
      switch (wallet.type) {
        case 'aen':
          networkHandler = getters['networkHandler']('aen')
          networkHandler.getLiveWallet(wallet).then((response) => {
            resolve(response)
          })
          .finally(() => { dispatch('busy', false, { root: true }) })
          break
        case 'btc':
          networkHandler = getters['networkHandler']('btc')
          networkHandler.getLiveWallet(wallet).then((response) => {
            resolve(response)
          })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
        case 'contract':
          parentWallet = state.wallets[wallet.managerWalletAddress]
          networkHandler = getters['networkHandler'](
              { type: 'contract', network: $g.eth.available_networks[parentWallet.network].identifier })
          networkHandler.getLiveWallet(wallet).then((response) => {
            resolve(response)
          })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
        case 'eth':
          networkHandler = getters['networkHandler'](
            { type: 'eth', network: $g.eth.available_networks[wallet.network].identifier })
          networkHandler.getLiveWallet(wallet).then((response) => {
            resolve(response)
          })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
      }
    })
  },
  /**
   *
   * @param state
   * @param commit
   * @param dispatch
   * @param options
   * @returns {Promise<any>}
   */
  load({state, commit, getters, dispatch}, options) {
    let parentWallet
    const typeRef = options.type[0].toUpperCase() + options.type.slice(1)

    // Check whether the name has already been used and add a random suffix if so
    if(getters['getByName'](options.name)) {
      options.name = options.name + (Math.random() + 1).toString(36).substring(6)
    }

    return new Promise(async (resolve) => {
      const wallet = {
        onChain: options.onChain || false,
        name: options.name,
        balance: options.balance || 0,
        balanceLastSynced: 1,
        transactions: options.transactions || {},
        transactionsLastSynced: 1,
        type: options.type
      }

      let networkHandler
      switch (typeRef) {
        case 'Aen':
          networkHandler = getters['networkHandler']('aen')
          networkHandler.accountLoad(options).then((accountObject) => {
            options.account = accountObject
            networkHandler
              .walletLoad(options)
              .then((walletObject) => {
                Object.assign(wallet, walletObject)
                // wallet.onChain = networkHandler.getLiveWallet(options)
                if(options.main === true) {
                  commit('set'+typeRef+'Property', {
                    key: 'mainAddress',
                    value: wallet.address
                  })
                }
                commit('setAenProperty', {
                  key: 'walletCount',
                  value: (state.aen.walletCount + 1)
                })
                dispatch('security/monitorWallet', wallet, {root:true})
                delete wallet.credentials
                commit('setWallet', wallet)
                resolve(wallet)
              })
          })
          break

        case 'Btc':
          networkHandler = getters['networkHandler']('btc')
          networkHandler.walletLoad(options).then((walletObject) => {
            Object.assign(wallet, walletObject)
            dispatch('security/monitorWallet', wallet, {root:true})
            delete wallet.credentials
            commit('setWallet', wallet)
            commit('setBtcProperty', {
              key: 'walletCount',
              value: (state.btc.walletCount + 1)
            })
            resolve(wallet)
          })
          break

        case 'Contract':
          parentWallet = state.wallets[options.managerWalletAddress]
          networkHandler = getters['networkHandler'](
              { type: 'contract', network: $g.eth.available_networks[parentWallet.network].identifier })
          networkHandler.walletLoad(options).then((walletObject) => {
            Object.assign(wallet, walletObject)
            commit('setWallet', wallet)
            resolve(wallet)
          })
          break

        case 'Eth':
          networkHandler = getters['networkHandler'](
              { type: 'eth', network: $g.eth.available_networks[options.network].identifier })
          networkHandler.walletLoad(options).then((walletObject) => {
            Object.assign(wallet, walletObject)
            dispatch('security/monitorWallet', wallet, {root:true})
            delete wallet.credentials
            commit('setWallet', wallet)
            commit('setEthProperty', {
              key: 'walletCount',
              value: (state.eth.walletCount + 1)
            })
            resolve(wallet)
          })
          break
      }
    })
  },
  /**
   *
   * @param dispatch
   * @param state
   * @param commit
   * @param options
   * @returns {Promise<any>}
   */
  new({dispatch, commit, getters, state}, options) {

    return new Promise((resolve) => {
      const wallet = {
        onChain: false,
        name: options.name,
        balance: 0,
        balanceLastSynced: false,
        transactions: {},
        transactionsLastSynced: false,
        type: options.type
      }
      let  networkHandler
      switch (options.type) {
        case 'aen':
          networkHandler = getters['networkHandler']('aen')
          networkHandler.walletNew(options).then((walletObject) => {
            Object.assign(wallet, walletObject)
            commit('setAenProperty', {
              key: 'walletCount',
              value: (state.aen.walletCount + 1)
            })
            if(options.main === true) {
              commit('setAenProperty', {
                key: 'mainAddress',
                value: wallet.address
              })
            }
            dispatch('security/monitorWallet', wallet, {root:true})
            delete wallet.credentials
            commit('setWallet', wallet)
            resolve(wallet)
          })
          break
        case 'btc':
          networkHandler = getters['networkHandler']('btc')
          networkHandler.walletNew(options).then((walletObject) => {
            Object.assign(wallet, walletObject)
            dispatch('security/monitorWallet', wallet, {root:true})
            delete wallet.credentials
            commit('setWallet', wallet)
            commit('setBtcProperty', {
              key: 'walletCount',
              value: (state.btc.walletCount + 1)
            })
            resolve(wallet)
          })
          break

        case 'eth':
          networkHandler = getters['networkHandler'](
              { type: 'eth', network: $g.eth.available_networks[options.network].identifier })
          networkHandler.walletNew(options).then((walletObject) => {
            Object.assign(wallet, walletObject)
            dispatch('security/monitorWallet', wallet, {root:true})
            delete wallet.credentials
            commit('setEthProperty', {
              key: 'walletCount',
              value: (state.eth.walletCount + 1)
            })
            commit('setWallet', wallet)
            resolve(wallet)
          })
          break
      }
    })
  },
  /**
   * TRANSACTION INFO
   * @param getters
   * @param options
   * @returns {Promise<any>}
   */
  transactionStatus({commit, dispatch, getters}, options) {
    Vue.$log.debug('Transaction Status', options)
    let workingTransaction
    // TODO Check here
    return new Promise((resolve) => {
      // There are cases where this is actually undefined so perform a quick check before trying to proceed
      if(typeof this !== 'undefined') {
        if(this.hasOwnProperty('app')) {
          dispatch('busy', this.app.i18n.t('wallet.message.transfer_check'), {root: true})
        }
      }
      const networkHandler = getters['networkHandler'](options)
      networkHandler.transactionStatus(options).then((transaction) => {
        Vue.$log.debug('Transaction status is', transaction)
        workingTransaction = Object.assign({}, options, transaction)
        commit('TRANSACTION_TRACK', workingTransaction)
        dispatch('busy', false, { root: true})
        resolve(transaction)
      })
    })
  },

  transactionsPending({commit, dispatch, getters, state}, wallet) {
    Vue.$log.debug('Wallet Store: Transactions Pending', wallet)
    return new Promise(async (resolve) => {
      let networkHandler, transactions
      switch (wallet.type) {
          case 'aen':
            networkHandler = getters['networkHandler']('aen')
            transactions = await networkHandler.transactionsUnconfirmed(wallet)
            Vue.$log.debug('Transactions back from network handler', transactions)
            for(let transactionHash in transactions) {
              if(!state.trackedTransactions.hasOwnProperty(transactionHash)) {
                commit('TRANSACTION_TRACK', transactions[transactionHash])
              }
            }

            dispatch('busy', false, { root: true })
            resolve(transactions)
            break
          case 'btc':
            networkHandler = getters['networkHandler']('btc')
            break
          case 'contract':
            networkHandler = getters['networkHandler'](
              { type: 'contract', network: $g.eth.available_networks[wallet.network].identifier })
            break
          case 'eth':
            networkHandler = getters['networkHandler'](
              { type: 'eth', network: $g.eth.available_networks[wallet.network].identifier })
            break
        }
      })
  },
  /**
   *
   * @param commit
   * @param dispatch
   * @param options
   * @returns {Promise<any>}
   */
  transfer({commit, dispatch, getters}, options) {
    return new Promise((resolve, reject) => {
      let networkHandler, parentWallet

      // Check whether the destination is using a contact from the address book
      if (typeof options.destination.address === 'object' && options.destination.address !== null) {
        options.destination.address = options.destination.address.address
      }
      // There are cases where this is actually undefined so perform a quick check before trying to proceed
      if(typeof this !== 'undefined') {
        if(this.hasOwnProperty('app')) {
          dispatch('busy', this.app.i18n.t('wallet.message.transfer_start'), {root: true})
        }
      }
      switch (options.source.type) {
        case 'aen':
          networkHandler = getters['networkHandler']('aen')
          networkHandler.transfer(options).then((transaction) => {
            resolve(transaction)
          })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
        case 'btc':
          networkHandler = getters['networkHandler']('btc')
          networkHandler.transfer(options).then((transfer) => {
            resolve(transfer)
          })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
        case 'contract':
          parentWallet = state.wallets[options.transfer.managerWalletAddress]
          networkHandler = getters['networkHandler'](
              { type: 'contract', network: $g.eth.available_networks[parentWallet.network].identifier })

          networkHandler.transfer(options).then((transfer) => {
            resolve(transfer)
          })
              .finally(() => { dispatch('busy', false, { root: true }) })
          break
        case 'eth':
          networkHandler = getters['networkHandler'](
              { type: 'eth', network: $g.eth.available_networks[options.source.network].identifier })
          networkHandler.transfer(options).then((transaction) => {
            // Add tracking reference to the transaction
            commit('TRANSACTION_TRACK', transaction)
            resolve(transaction)
          })
          .catch((err) => {
            reject(err)
          })
            .finally(() => { dispatch('busy', false, { root: true }) })
          break
      }
    })
  },

  async pingNetworkApiNode({ commit, state }, network) {
    Vue.$log.debug('Wallet Store: Query API Node', network)
    const scanStart = new Date()
    const typeRef = network[0].toUpperCase() + network.slice(1)
    // ### SYNCHRONOUS CODE ###
    const height = await new typeRef(state[network].activeApiEndpoint, Vue.prototype.$g(network)).getHeight()
    const scanTime = new Date() - scanStart
    commit('set' + typeRef + 'Property', {
      key: 'apiPing',
      value: scanTime
    })
    commit('set' + typeRef + 'Property', {
      key: 'apiHeight',
      value: height
    })
    return scanTime
  },
  /**
     * Cycle through all available API nodes, testing how long it takes to get information on
     * the first block. Choose node with lowest ping
     *
     * @param {*} context
     */
  async rankApiNodes({ commit, state }) {
    const aenApiEndpoints = Vue.prototype.$g('aen.api_endpoints')
    const apiCount = aenApiEndpoints.length
    let currentBest = 9999

    // Test function encapsulate for variable scoping and asynchronous calling
    const check = function (currentRound) {
      const position = currentRound
      const thisAddress = aenApiEndpoints[position].address + Vue.prototype.$g('aen.api_endpoint_height')
      aenApiEndpoints[position].scanStart = new Date()
      // Perform the actual call
      this.$axios
        .$get(thisAddress)
        .then(() => {
          // Calculate ping time, output the response when in debug mode to satisfy linter
          aenApiEndpoints[position].scanEnd = new Date()
          aenApiEndpoints[position].scanTime = aenApiEndpoints[position].scanEnd - aenApiEndpoints[position].scanStart

          // If the test beats current score, set as endpoint to use
          if (aenApiEndpoints[position].scanTime < currentBest) {

            if(state.aen.activeApiEndpoint !== aenApiEndpoints[position].address) {
              currentBest = aenApiEndpoints[position].scanTime
              commit('setAenProperty', {
                key: 'activeApiEndpoint',
                value: aenApiEndpoints[position].address
              })
              commit('setAenProperty', {
                key: 'apiPing',
                value: aenApiEndpoints[position].scanTime
              })
            }
          }
        })
        .catch(() => {
          Vue.$log.debug('Node offline: ' + thisAddress)
        })
    }.bind(this)

    // Start performing the checks asynchronously
    for (
      let currentRound = 0;
      apiCount > currentRound;
      currentRound++
    ) {
      check(currentRound)
    }
  },

  async updateAll({commit, dispatch, state}) {
    Vue.$log.debug('Wallet Store: Update All wallets')
    const now = Date.now()

    for(let walletAddress in state.wallets) {
      const wallet = state.wallets[walletAddress]
      if(wallet.onChain === true) {
        await dispatch('balance', state.wallets[walletAddress])
        await dispatch('transactionsHistorical', state.wallets[walletAddress])
        await dispatch('transactionsPending', state.wallets[walletAddress])
        await dispatch('transactionsTrackedProcess', state.wallets[walletAddress])
      } else {
        await dispatch('getLiveWallet', wallet).then((walletOnChain) => {
          if (walletOnChain !== false) {
            commit('WALLET_PROP', {
              address: walletAddress,
              key: 'onChain',
              value: true
            })
          }
        })
      }
      commit('WALLET_PROP', {
        address: walletAddress,
        key: 'lastSynced',
        value: now
      })
    }
  },

  transactionsTrackedProcess({dispatch, getters}, wallet) {
    Vue.$log.debug('Wallet Store: Transactions tracked process', wallet)
    // Check whether any of the already existing transactions are no longer in the unconfirmed bin and mark complete
    const trackedTransactions = getters['trackedTransactionsByWallet'](wallet)
    for(let trackedTransactionHash in trackedTransactions) {
      if (trackedTransactions[trackedTransactionHash].status === 'PENDING') {
        dispatch('transactionStatus', trackedTransactions[trackedTransactionHash])
      }
    }
  }
}

export const mutations = {
  reset(state) {
    Object.assign(state, initialState)
  },
  removeWallet(state, wallet) {
    Vue.delete(state.wallets, wallet.address)
    Vue.delete(state.contacts, wallet.address)
  },
  setAccountStatus(state, status) {
    state.meta.wallet_present = status
  },
  setWallet(state, wallet) {
    console.log('wallet from store')
    console.log(wallet)
    Vue.set(state.wallets, wallet.address, wallet)
    if (wallet.type === 'aen') {
      state.aen.haveWallet = true
    }
    Vue.set(state.contacts, wallet.address, {
      displayText: wallet.name,
      type: wallet.type,
      address: wallet.address
    })
  },
  AEN_PROP(state, options) {
    Vue.set(state.aen, options.key, options.value)
  },
  // TODO Do a global find replace here for the cleaner above
  setAenProperty(state, options) {
    Vue.set(state.aen, options.key, options.value)
  },
  setBtcProperty(state, options) {
    Vue.set(state.btc, options.key, options.value)
  },
  setEthProperty(state, options) {
    Vue.set(state.eth, options.key, options.value)
  },
  WALLET_PROP(state, options) {
    state.wallets[options.address][options.key] = options.value
  },
  setWalletProperty(state, options) {
    state.wallets[options.address][options.key] = options.value
  },
  setProperty(state, options) {
    state.wallets[options.address][options.key] = options.value
  },
  /**
     * Address Book related information
     */
  deleteContact(state, contact) {
    Vue.delete(state.contacts, contact.address)
  },
  setContact(state, contact) {
    Vue.set(state.contacts, contact.address, contact)
  },
  setPreferredNode(state, address) {
    state.internal.preferredNode = address
  },
  setActiveNodeList(state, nodeList) {
    state.internal.nodeList = nodeList
  },
  setNetwork(state, network) {
    state.context.network = network
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
  setContextProperty(state, input) {
    state.context[input.key] = input.value
  },
  setInternalProperty(state, input) {
    state.internal[input.key] = input.value
  },
  setMosaics(state, input) {
    state.mosaics = input
  },
  TRANSACTION_PROP(state, input) {
    state.trackedTransactions[input.txHash][input.key] = input.value
  },
  TRANSACTION_REMOVE(state, transactionHash) {
    Vue.delete(state.trackedTransactions, transactionHash)
  },
  TRANSACTION_TRACK(state, input) {
    Vue.set(state.trackedTransactions, input.txHash, input)
  }

}
