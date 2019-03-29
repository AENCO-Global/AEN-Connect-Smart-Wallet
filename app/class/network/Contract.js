import Vue from 'vue'
import Generic from '~/class/network/Generic'
import axios from 'axios'
import Web3 from 'web3'

export default class Contract extends Generic {
  constructor(apiEndpoint, config) {
    super()
    this.pluginName = 'contract'
    this.config = config
    this.web3 = new Web3(apiEndpoint)
  }

  balance(options) {
    super.balance(options)
    return new Promise((resolve, reject) => {
      import('~/class/network/contract/erc20').then((erc20Interface) => {
        const contract = new this.web3.eth.Contract(erc20Interface.abi, options.address)
        contract.methods.balanceOf(options.managerWalletAddress).call().then((response) => {
          Vue.$log.debug('Response back from trying to get balance from managing contract address', response)
          resolve(response.toString())
        })
          .catch((err) => {
            reject(err)
          })
      })
    })
  }

  async erc20PublicMethod(options) {
    Vue.$log.debug('ERC20 Method', options)
    return new Promise((resolve) => {
      import('~/class/network/contract/erc20').then((erc20Interface) => {
        // const contract = new this.web3.eth.Contract(erc20Interface.abi, options.contractAddress)
        const contract = new this.web3.eth.Contract(erc20Interface.abi, '0x3f2cfaec506acdc25dd38b7b7baaf5a5b6ad91ca')

        Vue.$log.debug('Got the contrat interface ready to play with', contract)

        contract.methods[options.method]().call().then((response) => {
          Vue.$log.debug('Contract Store: ERC20 Method Result '+ options.method + ' = ' + response)
          resolve(response)
        })
      })
    })
  }
  transactionsHistorical(options) {
    super.transactionsHistorical(options)
    const apiEndpoint = this.config.etherscan.api_endpoint.replace('###NETWORK_IDENTIFIER###', options.network.identifier)
    return new Promise((resolve, reject) => {
      axios.get(apiEndpoint, {
        params: {
          module: 'account',
          action: 'txlist',
          address: options.address,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: this.config.etherscan.api_key
        }
      })
        .then(function (response) {
          // Filter the results by the contract address
          response = response.data.result
          let transactions = []
          for(let transactionKey in response) {
            let transaction = response[transactionKey]
            if(transaction.contractAddress === options.wallet.address) {
              transactions.push(transaction)
            }
          }
          resolve(transactions)
        })
        .catch(function (error) {
          reject(error)
        })
    })
  }

  transfer(options) {
    super.transfer(options)
    return new Promise(({resolve, reject}) => {
      let transaction
            // TODO Add in the flexibility to handle meta contracts if there is a proxy transfer method
            import('~/class/network/contract/erc20').then((erc20Interface) => {
              const contract = new this.web3.eth.Contract(erc20Interface.abi, options.source.address)

              transaction = contract.methods.transfer(options.destination.address, options.destination.amount)
              transaction.chainId = options.transfer.managerWallet.network.network_id
              transaction.gasPrice = this.web3.utils.toHex(options.transfer.gasPrice)
              transaction.gas = this.web3.utils.toHex(options.transfer.gas)
              transaction.gasLimit = this.web3.utils.toHex(options.transfer.gasLimit)

              this.web3.eth.accounts.signTransaction(transaction, options.transfer.credentials.privateKey)
                .then(signedTx => this.web3.eth.sendSignedTransaction(signedTx.rawTransaction))
                .then((receipt) => {
                  console.log(receipt)
                  console.log('Transaction receipt: ', receipt)
                  resolve(receipt)
                })
                .catch((err) => {
                  console.log('something went wrong when sending a transaction')
                  console.error(err)
                  reject(err)
                })
            })
    })
  }

  /**
   * For Ethereum, check the balance of the account to determine whether or not it is live
   * @param options
   */
  getLiveWallet(options) {
    console.log('checking if CONTRACT has some wonga')
    super.getLiveWallet(options)

    return new Promise((resolve) => {
      this.balance(options).then((balance) => {
        if (balance.toString() !== '0') {
          resolve(true)
        } else {
          resolve(false)
        }
      })
    })
  }
  /**
     * Adoption of ERC20 contracts doesn't involve any initial processing so,
     * just use the opportunity to return properties from the original options
     * object
     * @param options
     * @returns {Promise<any>}
     */
  walletLoad(options) {
    super.walletLoad(options)

    return new Promise((resolve) => {
      resolve({
        name: options.contractName,
        address: options.address,
        onChain: true,
        managerWalletAddress: options.managerWalletAddress,
        symbol: options.symbol,
        decimals: options.decimals
      })
    })
  }

  walletNew(options) {
    Generic.prototype.walletNew.call(this, options)
    return this.web3.eth.accounts.create(options.password)
  }

  getWeb3() {
    return this.web3
  }
  setProvider(endpoint) { this.web3.setProvider(endpoint) }
  web3() { return this.web3 }
}
