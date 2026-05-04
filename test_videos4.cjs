const https = require('https');

const tests = [
  { name: "Incline DB Curl 1", id: "soxrZlIl35U" },
  { name: "Incline DB Curl 2", id: "aTYlqC_JacQ" },
  { name: "Incline DB Curl 3", id: "o_mFts5oRUU" },
  { name: "Incline DB Curl 4", id: "0GjdJKEqOww" }
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
