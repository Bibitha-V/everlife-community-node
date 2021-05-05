var nest = require('depnest')
var extend = require('xtend')
var { Value, h, computed, when } = require('mutant')
const cote = require('cote')({statusLogsEnabled:false})

exports.gives = nest('wallet.sheet.getSecret')
const displaySheet = require('../../../sheet/display')

exports.needs = nest({
  'intl.sync.i18n': 'first'
})

let stellarClient = new cote.Requester({
  name: `Get Secret Dialog -> Stellar`,
  key: 'everlife-stellar-svc',
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('wallet.sheet.getSecret', function (ondone) {
    var secret = Value('')
    var saving = Value(false)
    var disablebtn = computed([saving,secret], () => {
      return saving() || !(secret())
    })

    displaySheet(close => {
      return {
        content: h('div', {
            classList: 'WalletPw',
            style: {
                padding: '20px',
            }
        }, [
            h('h2', i18n('Enter Your Stellar Wallet Secret')),
            h('div.main', [
              h('div.info', [
                h('p', 'Please enter the stellar secret to import your wallet.'),
                h('p', 'This wallet will be used as your Avatar\'s wallet.'),
              ]),
              h('input.secret', {
                id: 'secret',
                type: 'text',
                placeholder: 'Stellar Wallet Secret',
                hooks: [ ValueHook(secret), FocusHook() ],
              }),
            ])
        ]),
        footer: [
          h('button -save', {
            'ev-click': importWallet,
            disabled: disablebtn,
          }, i18n('Import Wallet')),
          h('button -cancel', {
            'ev-click': close
          }, i18n('Cancel'))
        ],
      }


      function importWallet() {
        if(saving()) return
        saving.set(true)

        if(!secret()) return showErr(i18n('No Secret Provided'), i18n('Please enter the wallet secret seed'))

        stellarClient.send({ type: 'import-new-wallet', secret: secret() }, (err) => {
          saving.set(false)

          if(err) showErr(i18n('Failed importing new Wallet!', err))
          else {
            if(ondone) ondone()
            close()
          }
        })
      }

      function showErr(msg, detail) {
        var electron = require('electron')
        electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), {
          type: 'error',
          title: 'Cannot Import Wallet',
          buttons: [i18n('Ok')],
          message: msg,
          detail: detail,
        })
      }

    })
  })
}

function FocusHook () {
  return function (element) {
    setTimeout(() => {
      element.focus()
      element.select()
    }, 5)
  }
}

function ValueHook (obs) {
  return function (element) {
    element.value = obs()
    element.oninput = function () {
      obs.set(element.value)
    }
  }
}

