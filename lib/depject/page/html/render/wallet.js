var { h , Value, map } = require('mutant')
var nest = require('depnest')
var {clipboard} = require('electron')
const { ipcRenderer } = require('electron');
exports.needs = nest({
  'intl.sync.i18n': 'first',
  'wallet.handler.fetch.obsAccId': 'first',
  'wallet.handler.fetch.obsAccBal': 'first',
  'wallet.handler.fetch.obsAccTxns': 'first',

  'wallet.handler.setup.reload': 'first',
  'wallet.sheet.getSecret': 'first',

})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  let backingup = Value(false)

  return nest('page.html.render', function channel (path) {
    if (path !== '/wallet') return
    const i18n = api.intl.sync.i18n

    let accid = api.wallet.handler.fetch.obsAccId()
    let accbal = api.wallet.handler.fetch.obsAccBal()
    let acctxns = api.wallet.handler.fetch.obsAccTxns()

    return h('Scroller', {
        style: { overflow: 'auto' } }, [
      h('div.wrapper',{
        style:{
        }
      },h('div', [
        h('br'),
        h('div.WalletMeta',{
          style:{
            'width':'100%'
          }
        },[
          h('section',{
            style:{
              'width': '50%',
              'display': 'inline-block',
              'height': '15%',
              'display': 'inline-table',
              'vertical-align': 'middle',
            }
          },[
            h('a.buy-ever', {
              'href': '#',
              'ev-click': () => ipcRenderer.send('openBuyEverWindow'),
          }, h('span',{style:{'font-weight': 'bold','font-size':'18px'}},i18n('+ Buy EVER'))),h('br'),
          h('a.btn', {
            'ev-click': importNewWallet,
          }, h('span',i18n('Import Wallet'))),
          h('a.btn', {
            'ev-click': backup,
            'disabled': backingup
          }, h('span',i18n('Backup'))),
          ]),

          h('section',{
            style:{
              'text-align':'center',
              'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 4px 8px 0px',
              'transition': 'all 0.3s ease 0s',
              'width': '50%',
              'display': 'inline-block',
              'background-color': 'white',
              'text-align': 'center',
              'height': '15%',
              'display': 'inline-table',
              'vertical-align': 'middle',
              'padding':'10px',
            }
          },
          [
            h('span',{
              style:{
                'display':'inline-block',
                'text-align':'center',
                'font-weight': '600',
                'font-size': '41px',
                'color': '#707584',
                'font': '24px/24px "Open Sans", sans-serif',
                'vertical-align':'middle'
              }
            },i18n('Current Ever Balance')),
            h('br'),
            h('span',{
              style:{
                'display':'inline-block',
                'text-align':'center',
                'font-weight': '800',
                'font-size': '41px',
                'color': '#444750'
              }
            }, accbal.val)
          ]),
        ]),
        h('br'),
        h('div.WalletKey',[
          h('div.key',{
            'ev-click': () => {
              if(!accid.valid()) return
              let id = accid.val()
              clipboard.writeText(id)
              accid.val.set('(Copied)')
              setTimeout(()=> accid.val.set(id),1000)
            }
          }, accid.valid() ? accid.val : "(NOT FOUND)")
        ]),
        h('section.Wallet', [
          h('table',[
            h('tr',
              [
                h('th', i18n('Date')),
                h('th', i18n('Details'))
              ]),
            map(acctxns.val,to_list_1)
          ])
        ]),
      ]))
    ])

    function importNewWallet() {
      api.wallet.sheet.getSecret(api.wallet.handler.setup.reload)
    }
    function backup() {
      if(backingup()) return
      backingup.set(true)

      const electron = require('electron')
      const elife = require('../../../../../elife/')

      const desktop = electron.remote.app.getPath('desktop')

        elife.backup(desktop, (err, loc) => {
          backingup.set(false)
          if(err) show_1(i18n('Error during backup'), err + '')
          else show_1(i18n('Backup saved to Desktop'),
            i18n('Please keep the backup safe and secure (it contains your secret keys!)'))
        })
    
      function show_1(msg, det) {
        electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), {
          type: 'info',
          title: i18n('Backup'),
          buttons: [i18n('OK')],
          message: msg,
          detail: det,
        })
      }
    }

    function to_list_1(txn) {
      txn = simplifyTxn(accid.val(), txn)
      let details = getTxnDetails(accid.val(), txn)
      return [
        h('tr',[
          h('td',{
            style:{
              'text-align':'left',
              'border': '1px solid #dddddd',
              'padding': '8px'
            }
          },new Date(txn.on).toLocaleString()),
          h('td',{
            style:{
              'text-align':'left',
              'border': '1px solid #dddddd',
              'padding': '8px'
            }
          }, [details,
              h('div', {
                  style: {
                      'font-weight': 'bold',
                      'color': '#aaa',
                      'padding-top': '4px',
                  }
              },txn.memo?txn.memo:'')]),
        ]),
      ]
    }
  })
}

/*      outcome/
 * Simplify the Transaction data so that it's easier to read and process
 * by people - getting rid of most of the data and making the types
 * easier to read
 */
function simplifyTxn(acc, txn) {

    let r = {}
    r.id = txn.id
    r.on = txn.created_at

    let version = txn.envelope_xdr.TransactionEnvelope.type.replace('envelopeTypeTx','').toLowerCase()
    if(!(version.length > 0)) version = 'v1'
    let data = txn.envelope_xdr.TransactionEnvelope[version].tx

    if(data.sourceAccount) {
      let sa = squash(data.sourceAccount)
      if(sa != acc) r.sourceAccount = sa
    }

    if(data.sourceAccountEd25519) {
      let sa = data.sourceAccountEd25519.value
      if(sa != acc) r.sourceAccount = sa
    }


    if(txn.memo) r.memo = txn.memo

    r.operations = []
    for(let i = 0;i < data.operations.length;i++) {
        let operation = data.operations[i]
        let op = xtract_body_1(operation.body)
        r.operations.push(op)
    }

    return r

    /*      outcome/
     * Return a simplified version of the operation body:
     *  type: "payment"
     *  paymentOp: {...}
     */
    function xtract_body_1(body) {
        let r = {
            type: body.type
        }

        let opdata = body[`${r.type}Op`]

        for(let k in opdata) r[k] = squash(opdata[k])

        return r
    }

    /*      outcome/
     * Handle some recognized types, otherwise ignore type and recurse
     * and try again (gives reasonably readable results)
     */
    function squash(v) {
        if(typeof v == "string") return v
        if(v.type == "amount") return v.value
        if(v.type == "keyTypeEd25519") return v.ed25519.value
        if(v.type == "assetTypeCreditAlphanum4" && v.alphaNum4) return squash(v.alphaNum4)
        let r = {}
        for(let k in v) {
            if(k == "type") continue
            r[k] = squash(v[k])
        }
        return r
    }
}


/*    outcome/
 * Returns the transaction details as html depending on the type of
 * operation.
 */
function getTxnDetails(acc, txn){
  let m = {
    payment: payment_details_1,
    changeTrust: changeTrust_details_1,
    createAccount: createAccount_details_1,
  }

  let r = []
  for(let i = 0;i < txn.operations.length;i++) {
    let op = txn.operations[i]
    let fn = m[op.type]
    if(fn) r.push(fn(op))
    else r.push(JSON.stringify(op))
  }

  return h('span', r)

  function payment_details_1(op) {
      let assetcode = op.asset.assetCode ? op.asset.assetCode : 'XLM'
      if(op.destination === acc) {
        return h('span', {
            style: {
                color: 'green',
            }
        }, `Credited with ${op.amount} ${assetcode} from ${txn.sourceAccount}`)
      } else {
        return `Debited with ${op.amount} ${assetcode} to ${op.destination}s`
      }
  }

  function changeTrust_details_1(op) {
      return `New trustline limit of ${op.limit} for asset ${op.line.assetCode} issued by ${op.line.issuer.ed25519.value} `
  }

  function createAccount_details_1(op) {
      return `Wallet created with initial balance of ${op.startingBalance} XLM`
  }
}
