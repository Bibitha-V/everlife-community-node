'use strict'
const path = require('path')
const fs = require('fs')
const os = require('os');

const archiver = require('archiver')
const u = require('@elife/utils')

function backup(loc, cb) {
    let n = path.join(loc, `Everlife-Backup-${date_now_1()}.zip`)

    let o = fs.createWriteStream(n)
    let bk = archiver('zip')
    let has_err = false

    o.on('close', () => {
        if(!has_err) cb(null, n)
    })
    o.on('warning', (err) => {
        u.showErr(err)
    })
    o.on('error', (err) => {
        has_err = true
        cb(err)
    })

    bk.pipe(o)
    if(os.platform()=='win32') backupForWindows(bk)
    else bk.directory(u.dataLoc(), false)
    bk.finalize()

    function date_now_1() {
        let dt = new Date()
        return dt.getFullYear() +
            '-' +
            pad2(dt.getMonth() + 1) +
            '-' +
            pad2(dt.getDate()) +
            'T' +
            pad2(dt.getHours()) +
            '-' +
            pad2(dt.getMinutes()) +
            '-' +
            pad2(dt.getSeconds()) +
            '.' +
            dt.getMilliseconds()
    }

    /*      understand/
     * Windows is locking some directories so we are going to backup
     * only the wallet and the ssb
     */
    function backupForWindows(bk){
        const secretFilePath = path.join(u.dataLoc() , "__ssb/secret")
        const luminatepw = path.join(u.dataLoc(), ".luminate-pw")
        bk.append(fs.createReadStream(secretFilePath), { name: 'secret' })
        if (fs.existsSync(luminatepw)) {
            bk.append(fs.createReadStream(luminatepw), { name: '.luminate-pw' })
        }
        bk.directory(path.join(u.dataLoc(), 'stellar'), false)
    }

    function pad2(n) {
        if(n < 10) return '0' + n
        else return '' + n
    }

}

module.exports = backup