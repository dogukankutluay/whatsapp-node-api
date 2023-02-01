const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");

const config = require("./config.json");
const { Client, LocalAuth } = require("whatsapp-web.js");

global.client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true },
});

global.authed = false;

const app = express();

const port = process.env.PORT || config.port;

app.use(bodyParser.json({ limit: "50mb" }));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

client.on("qr", (qr) => {
  fs.writeFileSync("./routes/last.qr", qr);
});

client.on("authenticated", () => {
  authed = true;

  try {
    fs.unlinkSync("./routes/last.qr");
  } catch (err) {}
});

client.on("auth_failure", () => {
  process.exit();
});

client.on("message", async (msg) => {
  if (config.webhook.enabled) {
    if (msg.hasMedia) {
      const attachmentData = await msg.downloadMedia();
      msg.attachmentData = attachmentData;
    }
    axios.post(config.webhook.path, { msg });
  }
});
client.on("disconnected", () => {
  console.log("disconnected");
});
client.initialize();

const { authRoute } = require("./routes");

app.use(function (req, res, next) {
  next();
});
app.use("/auth", authRoute);

app.listen(port, () => {
  console.log("Server Running : " + port);
});
