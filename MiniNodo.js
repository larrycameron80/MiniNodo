var https = require('https');
var pem = require('./pem.js');
var express = require("express");
var bodyParser = require("body-parser");
var nacl = require("tweetnacl");
var fs = require('fs');
var path = require('path');
var nconf = require('nconf');
var Datastore = require('nedb')
    , db = new Datastore({ filename: 'txndb', autoload: true });
var moneroWallet = require('./monero-nodejs.js');
var MNW = require('./MNW.js'), mnw = new MNW();
var open = require('open');
var ip = require("ip");
var prompt = require('prompt-sync')();

//https://www.npmjs.com/package/tweetnacl
//https://tweetnacl.cr.yp.to/
var portset = 3000;
var portset = process.env.PORT || 8080; //this line for heroku

var addrset = 'https://' + String(ip.address()) + ':' + String(portset);

//Also change this on routes (I will fix later so you can set it only here)
//var Wallet = new moneroWallet('localhost', 18082);
var Wallet = new moneroWallet();






//
//Check for incoming transfers, and add new transfers to wallet..
//
//
function checkTransfers() {
    //console.log("Checking for incoming transactions..");
    try {
        Wallet.incomingTransfers("all").then(function (t) {
            //console.log('found transfers, comparing with saved db');
            tx = t.transfers
            tx_hashes = []
            tmp = ""
            tx_amounts = []
            try {
                var i = 0;
                var n = -1;
                while (i < tx.length) {
                    tmp = tx[i].tx_hash;
                    tx_amounts.push(tx[i].amount / 1000000000000.0);
                    tx_hashes.push(tmp.replace("<", "").replace(">", ""));
                    n++;
                    j = i + 1;
                    //group transactions with same txn hash
                    while (j < tx.length) {
                        if (tx[j].tx_hash != tmp) {
                            break;
                        } else {
                            tx_amounts[n] += tx[j].amount / 1000000000000.0;
                        }
                        j++;
                    }
                    var txnsave = {
                        destination: "me",
                        xmramount: tx_amounts[n],
                        time: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                        txid: tx_hashes[n],
                        _id: tx_hashes[n]
                    };
                    try {
                        db.insert(txnsave);
                    } catch (err) {
                        //already inserted!
                    }
                    i = j;
                }
            } catch (errit) {
                //console.log("error in checking transactions!");
            }
            //console.log("checked transactions.");
        });
    } catch (err) {
        //console.log('that error...');
    }
}


//remove old incoming transfers, and add them again, parsed properly
//Note, this will mess up the time received, so only use it sparingly!
function reCheckTransfers() {
    db.remove({ destination: 'me' }, { multi: true }, function (err, numRemoved) {
        console.log("number of documents removed:", numRemoved);
    });
    checkTransfers();
}

nconf.argv().env().file({ file: 'config.json' });

//set this true, to update from old-style parsing.
if (1 == 0) {
    reCheckTransfers();
} else {
    checkTransfers();
}

var getPk = function () {
    //replace with qr in web-browser
    if (!nconf.get("MiniNeroPk")) {
        skpk = nacl.sign.keyPair();
        //console.log(mnw.ToHex(skpk.secretKey));
        MiniNeroPk = mnw.ToHex(skpk.publicKey);
        nconf.set('MiniNeroPk:key', MiniNeroPk);
        nconf.save(function (err) {
            fs.readFile('config.json', function (err, data) {
                //console.dir(JSON.parse(data.toString()))
            });
        });
    } else {
        MiniNeroPk = nconf.get("MiniNeroPk:key");
    }
    return MiniNeroPk;
}

var setPassword = function () {
    var pass1 = 'cat';
    var pass2 = 'dog';
    while (pass1 != pass2) {
        pass1 = prompt.hide('password?');
        pass2 = prompt.hide('again?');
        if (pass1 != pass2) {
            console.log('passwords not the same');
        }
    }
    var salt1 = mnw.ToHex(nacl.randomBytes(32));
    nconf.set('salt1:key', salt1);
    var ss = mnw.getSS(pass1, salt1);
    nconf.set('ss:key', ss);
    nconf.save(function (err) {
        fs.readFile('config.json', function (err, data) {
            //console.dir(JSON.parse(data.toString()))
        });
    });
}
setPassword();


pem.createPrivateKey(function (error, data) {
    var key = (data && data.key || '').toString();

    pem.createCertificate({ clientKey: key, days: 365, selfSigned: true }, function (err, keysnew) {

        pem.readPkcs12('cert.p12', { p12Password: 'cat' }, function (error, keys) {
            if (error != null) {
                //console.log("created new ssl cert.p12\n");
                keys = keysnew;

                pem.createPkcs12(keysnew.serviceKey, keysnew.certificate, 'cat', { cipher: 'aes256' }, function (err, pkcs12) {
                    fs.writeFile('cert.p12', pkcs12['pkcs12'], 'binary');
                });
            } else {
                //console.log("loaded ssl cert.p12");
                keys.serviceKey = keys.key;
                keys.certificate = keys.cert;
            }

            var app = express();
            //MiniNero Web (for now, comment this line out if desired)
            app.use('/', express.static(path.join(__dirname, 'public')));

            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({ extended: true }));

            var routes = require("./routes/routes.js")(app);

            //If you hate https:
            //var server = app.listen(port,  function () {

            //else
            port = portset;
            addr = addrset;
            var server = https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app).listen(port, function () {
                //console.log("Listening on port %s...", server.address().port);
                //check every 100 seconds for new transfers, which is half of the block-speed
                var txnChecker = setInterval(checkTransfers, 100 * 1000);

                MiniNeroPk = getPk();
                port = portset;
                addr = addrset;

                //automatically open web app on launch
                localaddr = 'https://localhost:' + port;
                //this might not work for purely remote users
                console.log("MiniNero web running on ", addrset);

                //auto open on start.. (needs better error handling) 
                /*
                open(localaddr, function (err) {
                if (err) throw err;
                    console.log('Possible error opening browser');
                });
                */

                if (!nconf.get("lastNonce")) {
                    lastNonce = Math.floor((new Date).getTime() / 1000);
                } else {
                    lastNonce = nconf.get("lastNonce:nonce");
                }
                Lasttime = 0;
            });
        });
    });
});
