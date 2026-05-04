const accountId = 'hRVwGDX-SKmXrJU79eee8g';
const clientId = 'MHtFbknvRylLkMvt7liYA';
const clientSecret = 'g1Gj23XXce8alPuLMmGqlS3JNA74ucpu';
const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
fetch('https://zoom.us/oauth/token?grant_type=account_credentials&account_id=' + accountId, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${basicAuth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}).then(res => res.json()).then(console.log).catch(console.error);
