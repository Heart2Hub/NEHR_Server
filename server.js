const moment = require("moment");
const { PORT_NUM } = require("./constants/PortNum");
const jsonServer = require("json-server");

const SECRET_KEY = require("./constants/SecretKey");
const SECRET_MESSAGE = require("./constants/SecretMessage");

const server = jsonServer.create();
const router = jsonServer.router("db.json");

const middlewares = jsonServer.defaults();

const port = process.env.PORT || PORT_NUM;

server.use(middlewares);
server.use(jsonServer.bodyParser);

const crypto = require("crypto");

function verify(msg, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  const ourSignature = hmac.update(msg).digest("base64");
  return ourSignature === signature;
}

server.use((req, res, next) => {
  const signedMessage = req.headers["encoded-message"];
  if (signedMessage) {
    const isValid = verify(SECRET_MESSAGE, signedMessage, SECRET_KEY);
    if (isValid) {
      next();
    } else {
      res.status(401).send("Invalid signature");
    }
  } else {
    res.status(400).send("Signed message header missing");
    console.log("HEADER MISSING");
  }
});

server.use((req, res, next) => {
  // Iterate through the request body and update date-time fields
  if (req.method === "POST" || req.method === "PUT") {
    for (const key in req.body) {
      if (
        typeof req.body[key] === "string" &&
        moment(req.body[key], moment.ISO_8601, true).isValid()
      ) {
        // Check if the field is a valid date-time in ISO 8601 format
        req.body[key] = moment(req.body[key]).format("YYYY-MM-DD HH:mm:ss");
      }
    }
  }
  next();
});

server.get("/records/:nric", (req, res) => {
  const nricToFind = req.params.nric;
  const records = router.db.get("records").value();

  const record = records.find((record) => record.nric === nricToFind);

  if (record) {
    res.json(record);
  } else {
    res
      .status(404)
      .json({ error: `Record with NRIC ${nricToFind} not found.` });
  }
});

server.post("/records", (req, res) => {
  const newRecord = req.body;

  const records = router.db.get("records").value();

  if (records.some((record) => record.nric === newRecord.nric)) {
    return res.status(400).json({
      error: `Record with NRIC ${newRecord.nric} already exists.`,
    });
  }

  records.push(newRecord);

  router.db.set("records", records).write();

  res.status(200).json(newRecord);
});

server.put("/records/:nric", (req, res) => {
  const nricToUpdate = req.params.nric;
  const recordToUpdate = req.body;

  const records = router.db.get("records").value();

  const indexToUpdate = records.findIndex(
    (record) => record.nric === nricToUpdate
  );

  if (indexToUpdate === -1) {
    return res
      .status(404)
      .json({ error: `Record with NRIC ${nricToUpdate} not found.` });
  }

  records[indexToUpdate] = recordToUpdate;

  router.db.set("records", records).write();

  res.status(200).json(recordToUpdate);
});

// Catch-all for any request that doesn't match the above routes.
server.use((req, res) => {
  res.status(404).send("Not Found");
});

server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});
