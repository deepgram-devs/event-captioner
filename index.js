require("dotenv").config();
const http = require("http");
const express = require("express");
const multer = require("multer");
const Socket = require("socket.io").Server;
const { Deepgram } = require("@deepgram/sdk");
const Airtable = require("airtable");
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const app = express();
const server = http.createServer(app);
const io = new Socket(server);

const upload = multer({ storage: multer.memoryStorage() });

app.set("view engine", "hbs");
app.use(express.static("public"));
app.use(express.json());

app.get("/", (req, res) => {
  res.redirect("https://developers.deepgram.com");
});
app.get("/events", (req, res) => {
  res.redirect("/");
});

app.get("/events/:slug", async (req, res) => {
  try {
    const event = await getEvent(req.params.slug);
    res.render("slug", { event: { title: event.title } });
  } catch (error) {
    res.render("error", { slug: req.params.slug, code: error });
  }
});

app.get("/events/:slug/broadcast", async (req, res) => {
  try {
    const event = await getEvent(req.params.slug);
    res.render("slug-broadcast", { event: { title: event.title } });
  } catch (error) {
    res.render("error", { slug: req.params.slug, code: error });
  }
});

app.get("/events/:slug/post", async (req, res) => {
  try {
    const event = await getEvent(req.params.slug);
    res.render("slug-post", { event: { title: event.title } });
  } catch (error) {
    res.render("error", { slug: req.params.slug, code: error });
  }
});

app.get("/events/:slug/post/yt", async (req, res) => {
  try {
    const event = await getEvent(req.params.slug);
    res.render("slug-post-yt", { event: { title: event.title } });
  } catch (error) {
    res.render("error", { slug: req.params.slug, code: error });
  }
});

app.post(
  "/events/:slug/post/transcribe",
  upload.single("file"),
  async (req, res) => {
    const event = await getEvent(req.params.slug);
    if (req.body.key != event.publisher_key)
      return res.json({ error: "Key is missing or incorrect" });
    const deepgram = new Deepgram(event.dg_key);
    const { mimetype, buffer } = req.file;
    const options = {
      paragraphs: true,
      punctuate: true,
      utterances: true,
      diarize: true,
      tier: "enhanced",
    };
    deepgram.transcription
      .preRecorded({ buffer, mimetype }, options)
      .then((response) => {
        const { transcript } =
          response.results.channels[0].alternatives[0].paragraphs;
        const webvtt = response.toWebVTT();
        const srt = response.toSRT();
        res.send({ transcript, files: { webvtt, srt } });
      })
      .catch((error) => {
        res.json({ error });
      });
  }
);

app.post("/events/:slug/auth", async (req, res) => {
  try {
    const { slug, key } = req.body;
    const event = await getEvent(slug);
    if (key != event.publisher_key)
      return res.json({ error: "Key is missing or incorrect" });
    const deepgram = new Deepgram(event.dg_key);
    const newKey = await deepgram.keys.create(
      event.dg_proj,
      "Temporary key - works for 10 secs",
      ["usage:write"],
      { timeToLive: 10 }
    );
    res.json({ deepgramToken: newKey.key });
  } catch (error) {
    res.json({ error });
  }
});

io.on("connection", (socket) => {
  socket.on("join", (message) => {
    socket.join(message.room);
    console.log(`${socket.id} joins ${message.room} as ${message.role}`);
  });
  socket.on("transcriptReady", (message) => {
    console.log(message);
    for (let room of socket.rooms) {
      socket.to(room).emit("transcriptComplete", message);
    }
  });
});

function getEvent(slug) {
  return new Promise((resolve, reject) => {
    base("events")
      .select({ filterByFormula: `{slug}="${slug}"` })
      .firstPage()
      .then((page) => {
        if (page.length == 0) reject(404);
        resolve(page[0].fields);
      })
      .catch((err) => {
        reject(500);
      });
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`listening on ${PORT} at ${new Date().toISOString()}`);
});
