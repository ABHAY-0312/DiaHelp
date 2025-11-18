const https = require('http');

const postData = JSON.stringify({
  riskScore: 75,
  keyFactors: ["high blood sugar", "poor diet", "sedentary lifestyle"]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate-timeline',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Timeline API Response:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.write(postData);
req.end();