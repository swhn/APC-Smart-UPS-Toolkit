
const express = require('express');
const snmp = require('net-snmp');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Configuration matching the Docker mapping
// Note: Docker maps 1161 on host to 161 in container
const TARGET_PORT = 1161; 
const TARGET_HOST = '127.0.0.1'; 
const COMMUNITY = 'public';

// OID Map (Same as Frontend)
const OID_MAP = {
  identModel: '1.3.6.1.4.1.318.1.1.1.1.1.1.0',
  upsBasicOutputStatus: '1.3.6.1.4.1.318.1.1.1.4.1.1.0', 
  batteryStatus: '1.3.6.1.4.1.318.1.1.1.2.1.1.0',
  batteryCapacity: '1.3.6.1.4.1.318.1.1.1.2.2.1.0',
  batteryTemperature: '1.3.6.1.4.1.318.1.1.1.2.2.2.0',
  runtimeRemaining: '1.3.6.1.4.1.318.1.1.1.2.2.3.0',
  inputVoltage: '1.3.6.1.4.1.318.1.1.1.3.2.1.0',
  inputFrequency: '1.3.6.1.4.1.318.1.1.1.3.2.4.0',
  outputVoltage: '1.3.6.1.4.1.318.1.1.1.4.2.1.0',
  outputLoad: '1.3.6.1.4.1.318.1.1.1.4.2.3.0',
  outputAmps: '1.3.6.1.4.1.318.1.1.1.4.2.4.0',
  firmwareVersion: '1.3.6.1.4.1.318.1.1.1.1.2.1.0',
  batteryReplaceDate: '1.3.6.1.4.1.318.1.1.1.2.1.3.0',
  batteryVoltage: '1.3.6.1.4.1.318.1.1.1.2.2.8.0',
  batteryReplaceIndicator: '1.3.6.1.4.1.318.1.1.1.2.2.4.0',
  externalBatteryCount: '1.3.6.1.4.1.318.1.1.1.2.2.5.0'
};

app.get('/api/ups-status', (req, res) => {
    // Create session for every request to keep it stateless/simple for dev
    const session = snmp.createSession(TARGET_HOST, COMMUNITY, {
        port: TARGET_PORT,
        version: snmp.Version2c,
        timeout: 1000
    });

    const oids = Object.values(OID_MAP);

    session.get(oids, function (error, varbinds) {
        if (error) {
            console.error("SNMP Error:", error);
            res.status(500).json({ error: error.toString() });
        } else {
            // Convert varbinds to simple key-value for frontend
            const result = {};
            varbinds.forEach(vb => {
                if (snmp.isVarbindError(vb)) {
                    console.error("Varbind Error", snmp.varbindError(vb));
                } else {
                    // Find key by OID
                    const key = Object.keys(OID_MAP).find(k => OID_MAP[k] === vb.oid);
                    if (key) {
                        result[key] = Buffer.isBuffer(vb.value) ? vb.value.toString() : vb.value;
                    }
                }
            });
            res.json(result);
        }
        session.close();
    });
});

app.listen(PORT, () => {
    console.log(`\n⚡ APC SNMP PROXY RUNNING ON PORT ${PORT}`);
    console.log(`   Targeting Docker Simulator at ${TARGET_HOST}:${TARGET_PORT}`);
    console.log(`   Frontend should poll http://localhost:${PORT}/api/ups-status\n`);
});
