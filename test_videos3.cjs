const https = require('https');

const tests = [
  { name: "calf raises", id: "a-x_NR-ibos" },
  { name: "face pulls", id: "rep-qVOkqgk" },
  { name: "hammer curls", id: "zC3nLlEvin4" },
  { name: "single arm db row", id: "pYcpY20QaE8" }
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
