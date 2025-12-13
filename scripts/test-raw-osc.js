const osc = require('osc');

// Configuration - EDIT THESE TO MATCH YOUR SETUP
const WING_IP = '192.168.1.50'; // Change to your Wing IP
const WING_PORT = 2223;         // Default Wing OSC port
const LOCAL_PORT = 9000;        // Local port to listen on

console.log('--- Wing Console Raw OSC Test ---');
console.log(`Target: ${WING_IP}:${WING_PORT}`);
console.log(`Local:  0.0.0.0:${LOCAL_PORT}`);

const udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: LOCAL_PORT,
    remoteAddress: WING_IP,
    remotePort: WING_PORT,
    metadata: true
});

udpPort.on("ready", function () {
    console.log("UDP Port is ready!");
    
    // 1. Send /xremote to subscribe to updates
    console.log("Sending /xremote...");
    udpPort.send({
        address: "/xremote",
        args: []
    });

    // 2. Test Fader Movement on Channel 40 (Monitor Main)
    // Move fader to 75%
    console.log("Moving Channel 40 Fader to 75%...");
    udpPort.send({
        address: "/ch/40/fdr",
        args: [
            {
                type: "f",
                value: 0.75
            }
        ]
    });

    // Wait 2 seconds then move back to 0%
    setTimeout(() => {
        console.log("Moving Channel 40 Fader to 0%...");
        udpPort.send({
            address: "/ch/40/fdr",
            args: [
                {
                    type: "f",
                    value: 0.0
                }
            ]
        });
    }, 2000);

    // Wait 4 seconds then exit
    setTimeout(() => {
        console.log("Test complete. Closing port.");
        udpPort.close();
        process.exit(0);
    }, 4000);
});

udpPort.on("message", function (oscMsg) {
    console.log("Received OSC Message:", oscMsg.address, oscMsg.args);
});

udpPort.on("error", function (err) {
    console.error("OSC Error:", err);
});

try {
    udpPort.open();
} catch (err) {
    console.error("Failed to open UDP port:", err);
}
