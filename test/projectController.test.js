const test = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config();
const projectModel = require("../models/projectModel");
const userModel = require("../models/userModel");
const xPublisher = require("../services/xPublisher");
const controller = require("../controllers/projectController");

function req() {
    return {
        session: { userId: "507f1f77bcf86cd799439011" },
        body: { projectName: "Cleanup", description: "Clean", location: "Haifa",
            category: "Environment", volunteers: "12", contact: "a@b.com" }
    };
}

function res() {
    return { statusCode: 200, body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; } };
}

async function scenario(options) {
    const originals = [userModel.findById, projectModel.create, xPublisher.publishProject,
        console.log, console.warn];
    const events = [];
    userModel.findById = async function() { return { username: "helper" }; };
    projectModel.create = async function() {
        events.push("insert");
        if (options.insertError) throw options.insertError;
    };
    xPublisher.publishProject = async function(project) {
        events.push("publish");
        assert.equal(project.projectName, "Cleanup");
        if (options.publishError) throw options.publishError;
        return "post-123";
    };
    console.log = function() {};
    console.warn = function() {};
    const response = res();
    try {
        await controller.createProject(req(), response);
        return { events, response };
    }
    finally {
        [userModel.findById, projectModel.create, xPublisher.publishProject,
            console.log, console.warn] = originals;
    }
}

test("publishes exactly once after insertion", async function() {
    const result = await scenario({});
    assert.deepEqual(result.events, ["insert", "publish"]);
    assert.deepEqual(result.response.body, { success: true });
});

test("X rejection preserves the successful response", async function() {
    const result = await scenario({ publishError: new Error("upstream secret") });
    assert.deepEqual(result.events, ["insert", "publish"]);
    assert.equal(result.response.statusCode, 200);
    assert.deepEqual(result.response.body, { success: true });
});

test("database failure does not publish", async function() {
    const result = await scenario({ insertError: new Error("database unavailable") });
    assert.deepEqual(result.events, ["insert"]);
    assert.equal(result.response.statusCode, 500);
    assert.deepEqual(result.response.body, { error: "Could not create project" });
});
