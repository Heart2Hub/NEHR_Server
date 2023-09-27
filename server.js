const { PORT_NUM } = require("./constants/PortNum");

const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");

const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

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

const port = process.env.PORT || PORT_NUM;

server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});
