const https = require('https');

const tests = [
  { name: "bicep curl 1", id: "in7PaeYlhrM" },
  { name: "bicep curl 2", id: "kwG2ipFRgfo" },
  { name: "tricep pushdown 1", id: "2-LAMcpzODU" },
  { name: "tricep pushdown 2", id: "6Fzep104f0s" },
  { name: "tricep extension 1", id: "kqG2XOwDEE0" },
  { name: "cable triceps pushdown", id: "2-LAMcpzODU" }
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
