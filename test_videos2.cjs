const https = require('https');

const tests = [
  { name: "bicep curl RP", id: "ykJmrZ5v0Oo" },
  { name: "tricep extension RP", id: "nRiJVZDpdL0" },
  { name: "goblet squat RP", id: "q_rJcAhN8lA" } // trying to find a working one for goblet squat
];

function checkVideo(id, name) {
  return new Promise((resolve) => {
    https.get(`https://img.youtube.com/vi/${id}/mqdefault.jpg`, (res) => {
      resolve({ name, id, status: res.statusCode });
    });
  });
}

async function run() {
  for (const {name, id} of tests) {
    const r = await checkVideo(id, name);
    console.log(`${name} (${id}) - Status: ${r.status}`);
  }
}
run();
