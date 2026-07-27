const logger = require('../utils/logger');

function getProvider() {
  return process.env.SMS_PROVIDER || 'fast2sms';
}

const smsService = {
  async sendOtp(phone, otp) {
    const provider = getProvider();
    const message = `Your OTP for Panchayat Grievance System is ${otp}. It expires in 5 minutes.`;

    switch (provider) {
      case 'twilio': {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_PHONE_NUMBER;
        if (!accountSid || !authToken || !from) {
          const err = new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
          err.statusCode = 500;
          throw err;
        }
        let twilio;
        try {
          twilio = require('twilio');
        } catch (e) {
          const err = new Error('Twilio package not installed. Run: npm install twilio');
          err.statusCode = 500;
          throw err;
        }
        const client = twilio(accountSid, authToken);
        const result = await client.messages.create({ body: message, from, to: '+91' + phone });
        logger.info(`OTP sent via Twilio to +91${phone}, SID: ${result.sid}`);
        break;
      }
      case 'msg91': {
        const apiKey = process.env.SMS_API_KEY;
        const senderId = process.env.SMS_SENDER_ID || 'GVNCE';
        if (!apiKey) {
          const err = new Error('MSG91 API key not configured. Set SMS_API_KEY in .env');
          err.statusCode = 500;
          throw err;
        }
        const https = require('https');
        const postData = JSON.stringify({
          sender: senderId,
          mobiles: '91' + phone,
          message
        });
        const response = await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: 'api.msg91.com',
            path: '/api/v5/flow/',
            method: 'POST',
            headers: {
              'authkey': apiKey,
              'Content-Type': 'application/json'
            }
          }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
          });
          req.on('error', reject);
          req.write(postData);
          req.end();
        });
        logger.debug('MSG91 response: ' + response.body);
        let parsed;
        try { parsed = JSON.parse(response.body); } catch (e) { parsed = {}; }
        if (response.status !== 200 || parsed.type === 'error') {
          const err = new Error(`MSG91: SMS failed - ${parsed.message || 'Unknown error'}`);
          err.statusCode = 500;
          throw err;
        }
        logger.info(`OTP sent via MSG91 to +91${phone}`);
        break;
      }
      case 'fast2sms': {
        const apiKey = process.env.SMS_API_KEY;
        const senderId = process.env.SMS_SENDER_ID || 'GVNCE';
        if (!apiKey) {
          const err = new Error('Fast2SMS API key not configured. Set SMS_API_KEY in .env');
          err.statusCode = 500;
          throw err;
        }
        const https = require('https');
        const query = `/dev/bulkV2?authorization=${apiKey}&sender_id=${senderId}&message=${encodeURIComponent(message)}&numbers=${phone}&route=dlt`;
        const response = await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: 'www.fast2sms.com',
            path: query,
            method: 'GET'
          }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
          });
          req.on('error', reject);
          req.end();
        });
        logger.debug('Fast2SMS response: ' + response.body);
        let parsed;
        try { parsed = JSON.parse(response.body); } catch (e) { parsed = {}; }
        if (response.status !== 200 || parsed.return !== true) {
          const err = new Error(`Fast2SMS: SMS failed - ${parsed.message || 'Unknown error'}`);
          err.statusCode = 500;
          throw err;
        }
        logger.info(`OTP sent via Fast2SMS to +91${phone}, Request ID: ${parsed.request_id || 'N/A'}`);
        break;
      }
      case 'log': {
        logger.warn(`SMS_PROVIDER is set to "log". OTP ${otp} for +91${phone} was logged instead of sent via SMS.`);
        logger.info(`[DEV SMS] To: +91${phone} | OTP: ${otp} | Message: ${message}`);
        break;
      }
      default: {
        const err = new Error(`Unknown SMS provider "${provider}". Set SMS_PROVIDER to one of: twilio, msg91, fast2sms, log`);
        err.statusCode = 500;
        throw err;
      }
    }
  }
};

module.exports = smsService;
