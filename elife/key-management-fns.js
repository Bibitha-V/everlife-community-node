const { Cipher } = require("crypto")
const fs = require("fs")
const path = require("path")
const u = require("@elife/utils")
const { ipcRenderer } = require("electron")

const StellarHDWallet = require("stellar-hd-wallet")
const secret_ = require('@elife/secret')

var selectedPhrase = ""
var passMatch = false
var mnemonic

function checkBoxcheck(a) {
  var newVal = a.value == "false" ? true : false
  if (newVal == true)
    document.getElementById("termsOfUse").style =
      "background: rgb(57, 30, 218)"
  else
    document.getElementById("termsOfUse").style =
      "background: rgba(210, 216, 229, 0.4);"
  document.getElementById("termsOfUse").value = newVal
}

function showPhrases() {
  mnemonic = StellarHDWallet.generateMnemonic()
  document.getElementById("showbackup").innerHTML = mnemonic
}

function saveSecret(mnemonic, cb) {
  secret_.fromMnemonic(mnemonic, cb)
}

//Downloading the mnemonic phrase into a textfile
function download() {
  if (document.getElementById("showphrases")) {
    if (
      document.getElementById("showphrases").innerText == "Show backup phrase"
    ) {
      return false
    }
  }
  if (document.getElementById("showbackup").innerText.length > 0) {
    var a = document.body.appendChild(document.createElement("a"))
    a.download = "Backup_Phrase.txt"
    a.href =
      "data:text/html," + document.getElementById("showbackup").innerHTML
    a.click()
  }
}

//Copy to clipboard
function copytoClipBroad() {
  if (document.getElementById("showphrases")) {
    if (
      document.getElementById("showphrases").innerText == "Show backup phrase"
    ) {
      return false
    }
  }
  if (document.getElementById("showbackup").innerText.length > 0) {
    var range = document.createRange()
    range.selectNode(document.getElementById("showbackup"))
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
    document.execCommand("copy")
    window.getSelection().removeAllRanges()
  }
}

//on submit parse keys from step-3.html to step-4.html
function submitBtn(){
  if(mnemonic && mnemonic.length>0){
    window.location.href='step-4.html?phrase='+ mnemonic
  }else{
    alert('Click the "Show Backup Phrase" button first')
  }
}

function getMnemonic() {
  const params = new URLSearchParams(window.location.search)
  return params.get('phrase')
}


function submitPhrases() {
  const mnemonic = getMnemonic()
  const typed = document.getElementById('pharsetext').value
  if(!mnemonic || !typed) return

  if(mnemonic.trim() == typed.trim()) {
    saveSecret(mnemonic, err => {
      if(err) alert(err)
      else window.location.href='step-5.html'
    })
  }
  else{
    document.getElementById('pharsetext').value = ""
    document.getElementById('err-txt').classList.add("highlight")
    document.getElementById('pharsetext').innerHTML=""
    let errSelection = document.getElementById('err-selection');
    errSelection.innerHTML=`Backup phrase you have entered is not valid`;
    errSelection.style.color ='#f0932b';
    errSelection.style.padding = '5px'
  }
}

function goBack() {
  window.history.back()
}

function copyPhrases(){
  copytoClipBroad()
}


function openElifeDashboard(){
  ipcRenderer.send('mnemonic-keys-done')
  setTimeout(() => window.close(), 1000)
}

function termsAndConditions(){
  require("electron").shell.openExternal('https://stellar.org/terms-of-service');
}
function privacyPolicyStellar(){
  require("electron").shell.openExternal('https://stellar.org/privacy-policy');
}

function importBackup() {
  const userinputedMnemonic = document.getElementById('importphrase').value;
  const sourceSecretKey = document.getElementById('stellarID').value

  if(userinputedMnemonic){
    secret_.fromMnemonic(userinputedMnemonic, err => {
      if(err) {
        console.error(err)
        return
      }
      openElifeDashboard()
    })
  } else if(sourceSecretKey) {
    secret_.updateWalletKey(sourceSecretKey, err => {
      if(err) {
        console.error(err)
        return
      }
      openElifeDashboard()
    })
  }
}
