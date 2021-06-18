/** @module YoutubeAuth */
const baseURL = "https://accounts.google.com/o/oauth2/v2/auth/";
const axios = require("axios").default;
const generateNonce = len => require("crypto").randomBytes(len).toString("base64url");
let key;
const getKey = async () => {
    if (key)
        return key;
    else
        return (key = (await axios.get("keys")).data.keys[0]);
};

class AuthenticationError extends Error {
    /**
     * 
     * @param {string} message - Error Message
     */
    constructor(message) {
        super(message);
        this.name = "AuthenticationError";
    }
}
class BaseAuth {

    /**
     * https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps#creatingcred
     * @param {string} clientid - Client ID
     * @param {string} clientsecret - Client Secret
     * @param {string} redirect_uri - Redirect URI
     */
    constructor(clientid, clientsecret, redirect_uri) {
        this.clientid = clientid;
        this.clientsecret = clientsecret;
        this.redirect_uri = redirect_uri;
    }
    /** @private */
    stringify(any) {
        if (typeof any === "object")
            if (Array.isArray(any))
                return any.join(" ");
            else
                return JSON.stringify(any);
        else
            return any;
    }
    /** 
     * @private
     * @param {Object.<string,any>} object 
     * @param {function} transform
     * @returns {string}
    */
    querify(object, transform = e => e) {
        const result = [];
        for (const key in object)
            if (object[key] != null)
                if (Array.isArray(object[key]))
                    for (const value of object[key])
                        result.push(key + "=" + transform(this.stringify(value)))
                else result.push(key + "=" + transform(this.stringify(object[key])));
        return result.join("&");
    }
    /**
     * @param {"none"|"consent"|"select_account"} prompt - Prompt Type
     * @param {object} statestore - Server-sided storage object on the user
     * @param {Array<string>} scope - Scopes
     * @returns {Promise<string>} URL to send end user to
     */
    getAuthUrl(prompt, statestore, scope) {
        return new Promise((resolve, reject) => {
            statestore.googleAuthState = generateNonce(32);
            resolve(`${baseURL}auth?${this.querify({
                client_id: this.clientid,
                redirect_uri: this.redirect_uri,
                response_type: "code",
                scope,
                prompt,
                access_type: "online",
                state: statestore.googleAuthState
            }, encodeURIComponent)}`);
        });
    }

    /**
     * Get OAuth2 Access Token.
     * @param {object} query - req.query
     * @param {object} statestore - Server-sided storage object on the user
     * @returns {Promise<{access_token: string, expires_in: number, token_type: string | "Bearer", scope: string}>} - Access Token
     */
    getAccessToken(query, statestore) {
        const state = statestore.googleAuthState;
        delete statestore.googleAuthState;
        return new Promise((resolve, reject) => {
            if (query.state === state && typeof query.state !== "undefined")
                axios.post("https://oauth2.googleapis.com/token", this.querify({
                    client_id: this.clientid,
                    client_secret: this.clientsecret,
                    grant_type: "authorization_code",
                    redirect_uri: this.redirect_uri,
                    code: query.code
                }), {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }).then(result => resolve(result.data)).catch(err => reject(err))
            else
                reject(new AuthenticationError("Invalid State."));
        })
    }
}

class YoutubeAuth extends BaseAuth {
    /**
     * 
     * @param {"none"|"consent"|"select_account"} prompt - Prompt Type
     * @param {object} statestore - Server-sided storage object on the user
     * @returns {string} Authentication URL to send the user to
     */
    getAuthUrl(prompt, statestore) {
        return super.getAuthUrl(prompt, statestore, ["https://www.googleapis.com/auth/youtube.readonly"])
    }

    /**
     * Gets an OAuth key and uses that to get a channel ID.
     * @param {object} query - req.query
     * @param {object} statestore - Server-sided storage object on the user
     * @param {string[]} parts - Possible values: brandingSettings, contentDetails, contentOwnerDetails, id, localizations, snippet, statistics, status, topicDetails
     * @returns {Promise<object>} - YouTube channel data.
     */
    verify(query, statestore, parts) {
        return new Promise((resolve, reject) => {
            this.getAccessToken(query, statestore).then(result => {
                axios.get(`https://www.googleapis.com/youtube/v3/channels?` + this.querify({
                    part: parts,
                    mine: true
                }), {
                    headers: {
                        Authorization: result.token_type + " " + result.access_token,
                        Accept: "application/json"
                    },
                }).then(result => {
                    resolve(result.data.items[0]);
                }).catch(err => {
                    reject(err);
                })
            });
        });
    }
}
class GoogleAuth extends BaseAuth {
    constructor(clientid, clientsecret, redirect_uri, email = false) {
        super(clientid, clientsecret, redirect_uri);
        this.email = email;
        if (email)
            this.scopes = ["profile", "email"]
        else
            this.scopes = ["profile"]
    }
    /**
     * 
     * @param {"none"|"consent"|"select_account"} prompt - Prompt Type
     * @param {object} statestore - Server-sided storage object on the user
     * @returns {string} Authentication URL to send the user to
     */
    getAuthUrl(prompt, statestore) {
        return super.getAuthUrl(prompt, statestore, this.scopes);
    }

    /**
     * Gets an OAuth key and uses that to get a channel ID.
     * @param {object} query - req.query
     * @param {object} statestore - Server-sided storage object on the user
     * @returns {Promise<{id:string|number, name: string, given_name: string, picture: string, locale: string}>} - Google User, id is an integer casted to a string.
     */
    verify(query, statestore) {
        return new Promise((resolve, reject) => {
            this.getAccessToken(query, statestore).then(result => {
                axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json`, {
                    headers: {
                        Authorization: result.token_type + " " + result.access_token,
                        Accept: "application/json"
                    },
                }).then(result => {
                    resolve(result.data);
                }).catch(err => {
                    reject(err);
                })
            });
        });
    }
}

module.exports = { YoutubeAuth, GoogleAuth, BaseAuth };