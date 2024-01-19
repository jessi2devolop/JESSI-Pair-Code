const express = require('express');
const pino = require('pino');
const { makeWASocket, useSingleFileAuthState, useMultiFileAuthState, delay, PHONENUMBER_MCC, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const { toBuffer } = require('qrcode');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3030;

app.get('/', async (req, res) => {
  try {
    let { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./sessions', {});
    const msgRetryCounterCache = new NodeCache();

    const jessiBotInc = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      browser: ['Jessi-MD', 'opera', '3.0.0'],
      version,
    });

    jessiBotInc.ev.on('connection.update', async (s) => {
      if (s.qr !== undefined) {
        res.end(await toBuffer(s.qr));
      }

      const { connection, lastDisconnect } = s;

      if (connection == 'open') {
        console.log('Connected to WhatsApp Web!')
        await delay(10000); 
        await jessiBotInc.sendMessage(jessiBotInc.user.id, { text: 'Hello, thank you for choosing Jessi-MD' });

        
        const session = fs.readFileSync('./sessions/creds.json');
        await jessiBotInc.sendMessage(jessiBotInc.user.id, { document: session, mimetype: 'application/json', fileName: 'creds.json' });

        
        execYourCommand();

        
        process.exit(0);
      }

      if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
        
        qr();
      }
    });

    jessiBotInc.ev.on('creds.update', saveCreds);
    jessiBotInc.ev.on('messages.upsert', () => {});
  } catch (error) {
    console.error('Error in QR code generator:', error);
  }
});

app.listen(PORT, () => console.log(`App listened on port ${PORT}`));
