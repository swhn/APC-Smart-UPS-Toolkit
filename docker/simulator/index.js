
const snmp = require("net-snmp");

const PORT = 161;

// APC OIDs (Must match constants.ts in the App)
const OIDS = {
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

// Simulation State
let state = {
    inputVoltage: 120,
    batteryCapacity: 100,
    load: 45,
    temp: 28,
    onBattery: false
};

const agent = snmp.createAgent({
    port: PORT,
    disableAuthorization: true,
    accessControlModelType: snmp.AccessControlModelType.None
}, function (error, data) {
    if (error) {
        console.error(error);
    } else {
        console.log("Agent received request");
    }
});

// Providers
const providers = [
    {
        name: "identModel",
        type: snmp.ObjectType.OctetString,
        oid: OIDS.identModel,
        handler: (pr) => snmp.VarBindType.OctetString,
        value: () => "APC Smart-UPS 3000 (Sim)"
    },
    {
        name: "firmwareVersion",
        type: snmp.ObjectType.OctetString,
        oid: OIDS.firmwareVersion,
        handler: (pr) => snmp.VarBindType.OctetString,
        value: () => "v4.2.SIM-DOCKER"
    },
    {
        name: "batteryReplaceDate",
        type: snmp.ObjectType.OctetString,
        oid: OIDS.batteryReplaceDate,
        handler: (pr) => snmp.VarBindType.OctetString,
        value: () => "10/25/2026"
    },
    {
        name: "inputVoltage",
        type: snmp.ObjectType.Integer,
        oid: OIDS.inputVoltage,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => {
            // Fluctuate voltage slightly
            return state.onBattery ? 0 : Math.floor(state.inputVoltage + (Math.random() * 4 - 2));
        }
    },
    {
        name: "outputVoltage",
        type: snmp.ObjectType.Integer,
        oid: OIDS.outputVoltage,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => 120
    },
    {
        name: "upsBasicOutputStatus",
        type: snmp.ObjectType.Integer,
        oid: OIDS.upsBasicOutputStatus,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => state.onBattery ? 3 : 2 // 3=OnBatt, 2=Online
    },
    {
        name: "batteryStatus",
        type: snmp.ObjectType.Integer,
        oid: OIDS.batteryStatus,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => 2 // 2=Normal
    },
    {
        name: "batteryCapacity",
        type: snmp.ObjectType.Integer,
        oid: OIDS.batteryCapacity,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => Math.floor(state.batteryCapacity)
    },
    {
        name: "batteryTemperature",
        type: snmp.ObjectType.Integer,
        oid: OIDS.batteryTemperature,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => state.temp
    },
    {
        name: "outputLoad",
        type: snmp.ObjectType.Integer,
        oid: OIDS.outputLoad,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => Math.floor(state.load + (Math.random() * 2 - 1))
    },
    {
        name: "runtimeRemaining",
        type: snmp.ObjectType.TimeTicks,
        oid: OIDS.runtimeRemaining,
        handler: (pr) => snmp.VarBindType.TimeTicks,
        value: () => {
            // Simple linear calc for sim: 100% = 60 mins (3600 sec) = 360000 ticks
            return Math.floor(state.batteryCapacity * 3600);
        }
    },
    {
        name: "outputAmps",
        type: snmp.ObjectType.Integer,
        oid: OIDS.outputAmps,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => 15 // Fixed for simplicity
    },
    {
        name: "batteryVoltage",
        type: snmp.ObjectType.Integer,
        oid: OIDS.batteryVoltage,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => state.onBattery ? 240 : 274 // 24.0V vs 27.4V (in tenths)
    },
    {
        name: "externalBatteryCount",
        type: snmp.ObjectType.Integer,
        oid: OIDS.externalBatteryCount,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => 1
    },
    {
        name: "batteryReplaceIndicator",
        type: snmp.ObjectType.Integer,
        oid: OIDS.batteryReplaceIndicator,
        handler: (pr) => snmp.VarBindType.Integer,
        value: () => 1 // 1=No
    }
];

// Register Providers
providers.forEach(p => {
    agent.registerProvider({
        name: p.name,
        type: p.type,
        oid: p.oid,
        handler: function (pr) {
            const val = p.value();
            return snmp.varbind.createVarbind({
                type: p.handler(pr),
                value: val
            });
        }
    });
});

console.log("APC UPS SNMP Simulator running on UDP 161");

// Simulation Loop
setInterval(() => {
    // If input voltage drops below 10, switch to battery
    if (Math.random() > 0.98) {
        // Occasional voltage sag
        state.inputVoltage = 110; 
    } else {
        state.inputVoltage = 120;
    }

    if (state.onBattery) {
        state.batteryCapacity = Math.max(0, state.batteryCapacity - 0.5);
    } else {
        if (state.batteryCapacity < 100) state.batteryCapacity += 1;
    }
}, 1000);
