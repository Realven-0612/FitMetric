const https = require('https');

const VIDEO_LIBRARY = {
  // Gym Exercises
  "barbell bench press": "_FkbD0FhgVE",
  "incline db press": "8fXfwG4ftaQ",
  "dumbbell bench press": "1V3vpcaxRYQ",
  "barbell rows": "Nqh7q3zDCoQ",
  "lat pulldown": "bNmvKpJSWKM",
  "seated cable row": "DHA7QGDa2qg",
  "back squat": "dW3zj79xfrc",
  "leg press": "EotSw18oR9w",
  "deadlift": "xNwpvDuZJ3k",
  "romanian deadlift": "5rIqP63yWFg",
  "overhead press": "zoN5EH50Dro",
  "lateral raises": "Kl3LEzQ5Zqs",
  "barbell curls": "54x2WF1_Suc",
  "tricep pushdowns": "1FjkhpZsaxc",
  "calf raises": "a-x_NR-ibos",
  "kettlebell swings": "n1df4ASFeZU",
  "dumbbell thrusters": "qnOikHllwWc",
  "goblet squat": "MeIiGibT6Xo",
  "face pulls": "rep-qVOkqgk",
  "hammer curls": "zC3nLlEvin4",
  "single arm db row": "pYcpY20QaE8",

  // Resistance Band
  "band bicep curls": "20xtfGZ37nw",
  "band tricep pushdown": "PtHlGbiCglY"
};

function checkVideo(id, name) {
  return new Promise((resolve) => {
    https.get(`https://img.youtube.com/vi/${id}/mqdefault.jpg`, (res) => {
      resolve({ name, id, status: res.statusCode });
    });
  });
}

async function run() {
  for (const [name, id] of Object.entries(VIDEO_LIBRARY)) {
    const r = await checkVideo(id, name);
    if (r.status !== 200) {
      console.log(`Failed: ${name} (${id}) - Status: ${r.status}`);
    }
  }
}
run();
