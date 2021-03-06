var pk = '';

var PageContent = React.createClass({

    render: function () {
        return (
            <div className="content">
                <h2 className="content-subhead">Welcome! </h2>
                <p>
                    MiniNero Web provides simple on-the-go management for your Monero Mobile Wallet.
                    </p><p>
                    Additionally, this web-app will help set-up your mobile wallet.
                    All you have to do is scan the qr code in the Api-key tab. (App integration coming soon)
                </p>

                <h2 className="content-subhead">Getting Started</h2>
                <p>
                    To get started, simply find a Monero or bitcoin address that you wish to send to, enter it
                  into the "send" tab, and click send.   
                </p>

                <h2 className="content-subhead">Notes </h2>
                <p>
                This app has been test on Chrome / Edge / Firefox. If you have a device running Safari and want to send some feedback, please let me know if it works or not. Additionally, if you want to help by adding features, let me know.
                </p>
                
                <h2 className="content-subhead">SSL Certificate</h2>
                <p>
                If you find yourself frequently using this, you can add the generated cert.p12 to your web-browser key store
                 (Change the p12 password if desired). To create a new certificate, simply delete cert.p12, the app will
                 generate a new one for you automatically.
                </p>

                <h2 className="content-subhead">More help</h2>
                <p>
                    The author can be contacted at shen.noether @gmx.com or at /u/NobleSir on reddit.
                    This software is provided free-of-charge and you use it at your own risk. 
                    The source code is available at: <br/> 
                    <a href="https://github.com/ShenNoether/MiniNodo">https://github.com/ShenNoether/MiniNodo</a>
                </p>
            </div>
        );
    }
});

document.getElementById("homelink").onclick = writeHome;
document.getElementById("logoutlink").onclick = writeLogout;

function writeLogout() {
    clicker();
    sessionStorage.clear();
    document.getElementById('balance').innerHTML = '0 XMR';
    writeLogin();
}

function writeHome() {

    document.getElementById("qrcode").innerHTML = '';
    document.getElementById("innercontent").innerHTML='';
    sk = sessionStorage.getItem('_sk');
    if (sk != '' & sk != null) {
        //Also load it on start..
        ReactDOM.render(
            <PageContent />,
            document.getElementById('innercontent')
        );
        writeBalance();
    }
}

function writeLogin() {
    var sid = isLoggedIn();
    console.log('a');
    if (!sid) {
        console.log('b');
        document.body.style.background = "black";
        document.getElementById("qrcode").innerHTML = '';
        document.getElementById("innercontent").innerHTML='';
        ReactDOM.render(
            <LoginForm />,
            document.getElementById("innercontent")
        );
    } else {
        console.log('c');
        writeHome();
    }
}




function passToSk(pass) {
    var ip = 'https://' + window.location.host;
    var route = '/api/salt1/';
    var theUrl = ip + route;
    spinner.spin(spint);
        $.ajax({
            url: theUrl,
            type: 'GET',
            success: function (data) {
                spinner.stop();
                sessionStorage.clear();
                var salt1 = data.split(',')[0];
                var cb_time = parseInt(data.split(',')[1], 10);
                var lastNonce = data.split(',')[2];
                sessionStorage.setItem('lastNonce', lastNonce);
                var now = mnw.Now();
                var offset = Math.max(cb_time - now, 30);
                sessionStorage.setItem('offset', String(offset));
                var salt2 = mnw.genSalt();
                var issuetime = String(cb_time);
                sessionStorage.setItem('salt2', salt2);
                sessionStorage.setItem('issuetime', issuetime);
                var token = mnw.genTokenClient(pass, salt1, salt2, issuetime);
                sessionStorage.setItem('_sk', token);
                document.body.style.background = "white";
                writeHome();
                return token;
            },
            error: function (data) {
                spinner.stop();
                alert('cannot reach server!');
                return 'false';
            }
        });
}

var LoginForm = React.createClass({
  getInitialState: function() {
        var theme = window.localStorage.getItem('theme');
        if (theme == null) {
        console.log('could not retrieve theme');
            theme = 1;
        }
        console.log('theme is',theme);
        return { password: '', picture: ['mn620x300.png', 'LargeOrange.png'],colors:["#1f8dd6", "#5b9a6f"], picturevalue:theme };
  },
  login: function (e) {
        e.preventDefault();
        var sk = passToSk(this.state.password);
  },
  handleChangePass: function(event) {
        this.setState({ password: event.target.value});
  },
  handleThemeChange: function() {
    this.setState({ picturevalue: (this.state.picturevalue+1) % 2});
    
    console.log('setting localstorage theme as ', this.state.picturevalue);
    window.localStorage.setItem('theme', (this.state.picturevalue +1 )% 2);
    //location.reload var theme =    window.localStorage.getItem('theme');
    var menuHeader = document.getElementById("balancelink");
    var theme = (this.state.picturevalue + 1 ) % 2;
    
    if (theme == 0) {
        console.log('menu theme 0');
        menuHeader.style.background = "#1f8dd6";
    } else if (theme == 1) {
        console.log('menu theme 1');
        menuHeader.style.background = "#5b9a6f"
    }
  },
  render: function () {
    var logoStyle = {
      display:'block',
      maxWidth:'100%',
      marginLeft:'auto',
      marginRight:'auto'
    };
    var inputStyle = {
      display:'block',
      marginLeft:'auto',
      marginRight:'auto',       
    };
    var buttonStyle = {
      display:'block',
      marginLeft:'auto',
      marginRight:'auto',
      background:this.state.colors[this.state.picturevalue]
    };
    var wrapperStyle = {
        padding :'15px',
        background : 'black',
        font : 'white'
    }
    return (
     
        <div id="wrapper" style={wrapperStyle}>
            <img style={logoStyle} onClick={this.handleThemeChange} src={"images/"+this.state.picture[this.state.picturevalue]}></img>
            
              <form className="pure-form">
               
                <input type="password" value={this.state.password} onChange={this.handleChangePass} style={inputStyle} placeholder='password' className="pure-input-rounded"></input>
              
                <button type="submit" style={buttonStyle} onClick={this.login} className="pure-button pure-button-primary">Login</button>
              
              </form>
            </div>
      
    )
  }
});
writeLogin();