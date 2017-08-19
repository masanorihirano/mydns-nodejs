const cron = require('cron').CronJob;
const request = require('request');
const config = require('./config');
const moment = require('moment');

if(!process.env.NODE_NOW) {
  new cron({
    cronTime: config.cron,
    onTick: main,
    start: true,
    timeZone: config.timeZone
  });
}else{
  main();
}

function main() {
  config.accounts.reduce((promise, account)=>{
    return promise.then(()=>{
      return new MyDns(account).updateDNS();
    });
  }, Promise.resolve()).catch((e)=>{console.error(e);});
}

class MyDns {
  constructor(account) {
    this.MasterID = account.MasterID;
    this.Password = account.Password;
    this.protocol = account.protocol;
    this.notify = account.notify;
  }
  updateDNS() {
    return new Promise((resolve, reject)=>{
      let url;
      if(this.protocol=='all')
        url='http://mydns.jp/login.html';
      else if(this.protocol=='ipv4')
        url='http://ipv4.mydns.jp/login.html';
      else if(this.protocol=='ipv6')
        url='http://ipv6.mydns.jp/login.html';
      else return reject();
      request(url, {'auth': {'user': this.MasterID, 'pass': this.Password}}, (err, response)=>{
        if(err) {
          this._notify(err, null);
          resolve();
          return;
        }
        if(200<=response.statusCode && response.statusCode<300) {
          this._notify(null, response);
          resolve();
        }else{
          const err = new Error(`status: ${response.statusCode}`);
          this._notify(err, null);
          resolve();
          return;
        }
      });
    });
  }

  _bodyParser(body) {
    const MasterID = body.match(/<DT>MASTERID :<\/DT><DD>(mydns\d+)<\/DD>/)[1];
    const daytime = body.match(/<DT>ACCESS DAYTIME:<\/DT><DD>(\d+\/\d+\/\d+ \d+:\d+)<\/DD>/)[1];
    const address = body.match(/<DT>REMOTE ADDRESS:<\/DT><DD>(.+)<\/DD>/)[1];
    return {
      MasterID: MasterID,
      daytime: daytime,
      address: address
    };
  }

  _formatter(format, data, locale) {
    format = format.replace('{ADDR}', data.address);
    format = format.replace('{ID}', data.MasterID);
    format = format.replace(/{TIME\((.*)\)}/, (_, format)=>{
      return moment(data.daytime, 'YYYY/MM/DD mm:ss').locale(locale?locale:'en').format(format);
    });
    return format;
  }

  _notify(err, disc) {
    for(const notify of this.notify) {
      switch(notify.type) {
        case 'slack':
          if(err)this._sendSlack(notify.url, err.toString());
          else this._sendSlack(notify.url, this._formatter(notify.format, this._bodyParser(disc.body), notify.locale));
          break;
        case 'console':
          if(err)console.log(err.toString());
          else console.log(this._formatter(notify.format, this._bodyParser(disc.body), notify.locale));
          break;
      }
    }
  }

  _sendSlack(url, message) {
    const options = {
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      json: {
        'text': message
      }
    };
    request(options);
  }
}
