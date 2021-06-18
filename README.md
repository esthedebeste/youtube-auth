# google-auth

A simple way to get user account data.

## Usage

### Google Account data (name, picture, locale, and id) 
```js
const express = require('express');
const app = express();
app.use(require("express-session")({ secret: "secret" }));

const GoogleAuth = require("@tbhmens/google-auth").GoogleAuth;
//                                                       Set this to true to include email
//                                                                                  ⬇⬇⬇⬇⬇⬇
const login = new GoogleAuth("client id", "client secret", "http://localhost/done", false);
app.get("/", (req,res) => {
    login.getAuthUrl("select_account", req.session).then(
        url => res.redirect(url)
    ).catch(console.error);
});
app.get("/done", (req,res) => {
    login.verify(req.params, req.session).then(user => {
        res.send(`Your username is: ${user.name}`);
        console.table(user);
    });
});
```

### YouTube, id only
```js
const express = require('express');
const app = express();
app.use(require("express-session")({ secret: "secret" }));

const YoutubeAuth = require("@tbhmens/google-auth").YoutubeAuth;
const login = new YoutubeAuth("client id", "client secret", "http://localhost/done");
app.get("/", (req,res) => {
    login.getAuthUrl("select_account", req.session).then(
        url => res.redirect(url)
    ).catch(console.error);
});
app.get("/done", (req,res) => {
    //https://developers.google.com/youtube/v3/docs/channels/list#parameters
    //                                   ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
    login.verify(req.query, req.session, ["snippet","id"]).then(data => {
        res.send(`<html><body>
            Your YouTube ID is: ${data.id}<br/>
            <a href="https://youtube.com/channel/${data.id}"><img src="${data.snippet.thumbnails.medium.url}"></a>
        </body></html>`);
        console.log(data);
    });
});
```