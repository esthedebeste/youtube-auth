const express = require('express')
const app = express()
app.use(require("express-session")({
    secret: "test",
    resave: false,
    saveUninitialized: false,
    sameSite: "strict",
    name: "testing-id",
    cookie: {
        maxAge: 60000
    }
}));
// Path to an OAuth credentials JSON file downloaded from google
const creds = require(process.argv[2]);

const YoutubeAuth = require("../src/auth").YoutubeAuth;
const login = new YoutubeAuth(creds.web.client_id, creds.web.client_secret, creds.web.redirect_uris[2]);
app.get("/", (_, res) => {
    res.send(`
    <html>
        <body>
            <a href="/auth/youtube/redirect" style="font-size:14rem">GO</a>
        <body>
    </html>
    `)
});
app.get("/auth/youtube/redirect", (req, res) => {
    login.getAuthUrl("select_account", req.session).then(url => res.redirect(url)).catch(console.error);
});
app.get("/auth/youtube/login", (req, res) => {
    login.verify(req.query, req.session, ["snippet", "id"]).then(data => {
        res.send(`<html><body>
            Your YouTube ID is: ${data.id}<br/>
            <a href="https://youtube.com/channel/${data.id}"><img src="${data.snippet.thumbnails.medium.url}"></a>
        </body></html>`);
    });
});
app.listen(80, () => console.log(`Listening!`))