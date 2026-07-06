const { PrismaClient } = require('./node_modules/@prisma/client');
const nodeCrypto = require('crypto');
const p = new PrismaClient();

const fs = require('fs');
const path = require('path');
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envMap = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envMap[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
});

const hexKey = envMap['CREDENTIALS_ENCRYPTION_KEY'];
console.log('Hex key present:', !!hexKey, 'len:', hexKey ? hexKey.length : 0);

p.courierAccount.findFirst({ where: { provider: 'flaship', isActive: true } }).then(async (a) => {
  if (!a) { console.log('No active account'); return; }
  
  const KEY = Buffer.from(hexKey, 'hex');
  const [ivHex, encHex] = a.encryptedCredentials.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const dec = nodeCrypto.createDecipheriv('aes-256-cbc', KEY, iv);
  let d = dec.update(encHex, 'base64', 'utf8') + dec.final('utf8');
  const creds = JSON.parse(d);
  const apiKey = (creds.api_key || '').replace(/[^\x00-\xFF]/g, '').trim();
  
  console.log('API Key length:', apiKey.length);
  
  const res = await fetch('https://partners.flaship.pk/mr/company_list/', {
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });
  
  const text = await res.text();
  console.log('HTTP Status:', res.status);
  
  let json;
  try { json = JSON.parse(text); } catch(e) { console.log('RAW RESPONSE:', text.substring(0, 500)); return; }
  
  console.log('TOP KEYS:', Object.keys(json));
  
  if (json.companies) {
    console.log('Companies is array?', Array.isArray(json.companies));
    if (Array.isArray(json.companies) && json.companies[0]) {
      console.log('COMPANY[0] keys:', Object.keys(json.companies[0]));
      console.log('COMPANY[0]:', JSON.stringify(json.companies[0], null, 2));
    } else if (!Array.isArray(json.companies)) {
      console.log('Companies type:', typeof json.companies);
      console.log('Companies value:', JSON.stringify(json.companies).substring(0, 300));
    }
  }
  
  const cityKey = Object.keys(json).find(k => k.toLowerCase().includes('cit') || k.toLowerCase().includes('oper'));
  if (cityKey) {
    console.log('City-like key found:', cityKey);
    const val = json[cityKey];
    if (typeof val === 'object' && !Array.isArray(val)) {
      const subkeys = Object.keys(val).slice(0, 3);
      console.log('Sub keys:', subkeys);
      if (subkeys[0]) console.log('First sub-value:', JSON.stringify(val[subkeys[0]]).substring(0, 300));
    } else {
      console.log('Value:', JSON.stringify(val).substring(0, 300));
    }
  }
}).finally(() => p.$disconnect());
