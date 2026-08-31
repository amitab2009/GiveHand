const { TwitterApi } = require("twitter-api-v2");

const MAX_POST_LENGTH = 280;
const FIELD_NAMES = ["projectName", "location", "category", "volunteers"];

function cleanField(value) {
    return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function renderPost(fields) {
    return [
        "New volunteer opportunity: " + fields.projectName.join(""),
        "Location: " + fields.location.join(""),
        "Category: " + fields.category.join(""),
        "Volunteers needed: " + fields.volunteers.join(""),
        "#GiveHand #Volunteering"
    ].join("\n");
}

function formatProjectPost(project) {
    const fields = {};

    for (const name of FIELD_NAMES) {
        fields[name] = Array.from(cleanField(project[name])).slice(0, MAX_POST_LENGTH);
    }

    let post = renderPost(fields);

    while (Array.from(post).length > MAX_POST_LENGTH) {
        const longestField = FIELD_NAMES.reduce(function(longest, current) {
            return fields[current].length > fields[longest].length ? current : longest;
        });

        fields[longestField].pop();
        post = renderPost(fields);
    }

    return post;
}

function getCredentials() {
    const credentials = {
        appKey: process.env.X_API_KEY,
        appSecret: process.env.X_API_SECRET,
        accessToken: process.env.X_ACCESS_TOKEN,
        accessSecret: process.env.X_ACCESS_SECRET
    };

    if (Object.values(credentials).some(function(value) { return !value; })) {
        const error = new Error("X publishing is not configured");
        error.code = "X_NOT_CONFIGURED";
        throw error;
    }

    return credentials;
}

async function publishProject(project) {
    const client = new TwitterApi(getCredentials());
    const result = await client.v2.tweet(formatProjectPost(project));
    return result.data.id;
}

module.exports = {
    MAX_POST_LENGTH,
    formatProjectPost,
    publishProject
};
