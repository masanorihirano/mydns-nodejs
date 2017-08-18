module.exports = {
  cron: '00 * * * *',
  timeZone: 'Asia/Tokyo',
  accounts:[
    {
      MasterID: 'mydns******',
      Password: '***********',
      protocol: 'ipv4',
      //all ipv6 ipv4
      notify: [
        {
          type: 'slack',
          url: 'https://hooks.slack.com/services/**************************************',
          locale: 'en',
          format: '{ID}\n{ADDR}'
        },
        {
          type: 'console',
          locale: 'en',
          format: '{TIME(lll)} {ID} {ADDR}'
        }
      ]
    }
  ]
};