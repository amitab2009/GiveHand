const test = require("node:test");
const assert = require("node:assert/strict");
const xPublisher = require("../services/xPublisher");

test("formats required fields", function() {
    const post = xPublisher.formatProjectPost({
        projectName: "Park cleanup",
        location: "Haifa",
        category: "Environment",
        volunteers: 12
    });
    assert.equal(post, [
        "New volunteer opportunity: Park cleanup",
        "Location: Haifa",
        "Category: Environment",
        "Volunteers needed: 12",
        "#GiveHand #Volunteering"
    ].join("\n"));
});

test("normalizes line breaks and safely caps Unicode text at 280 characters", function() {
    const value = "🙂".repeat(400) + "\nextra";
    const post = xPublisher.formatProjectPost({
        projectName: value,
        location: value,
        category: value,
        volunteers: value
    });
    assert.ok(Array.from(post).length <= 280);
    assert.equal(post.split("\n").length, 5);
    assert.ok(!post.includes("\ufffd"));
    assert.doesNotThrow(function() { new TextEncoder().encode(post); });
});

test("missing credentials fail without exposing values", async function() {
    const names = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"];
    const previous = names.map(function(name) { return process.env[name]; });
    try {
        names.forEach(function(name) { delete process.env[name]; });
        await assert.rejects(xPublisher.publishProject({}), function(error) {
            assert.equal(error.code, "X_NOT_CONFIGURED");
            assert.equal(error.message, "X publishing is not configured");
            return true;
        });
    }
    finally {
        names.forEach(function(name, index) {
            if (previous[index] === undefined) delete process.env[name];
            else process.env[name] = previous[index];
        });
    }
});
