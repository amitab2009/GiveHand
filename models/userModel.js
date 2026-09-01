const { getDB } = require("../db");
const { ObjectId } = require("mongodb");

async function findByUsername(username) {
    return getDB().collection("users").findOne({
        username: username
    });
}

async function create(user) {
    const users = getDB().collection("users");

    await users.createIndex(
        { username: 1 },
        { unique: true }
    );

    await users.insertOne(user);
    return user;
}

async function findById(userId, hidePassword) {
    const options = hidePassword ? { projection: { password: 0 } } : {};

    return getDB().collection("users").findOne(
        { _id: new ObjectId(userId) },
        options
    );
}

async function updateProfile(userId, profile) {
    await getDB().collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: profile }
    );

    return findById(userId, true);
}

function findCreatedProjects(userId) {
    return getDB().collection("projects").find({
        createdBy: new ObjectId(userId)
    }).toArray();
}

function findJoinedProjects(userId) {
    return getDB().collection("projects").find({
        joinedBy: new ObjectId(userId)
    }).toArray();
}

module.exports = {
    findByUsername,
    create,
    findById,
    updateProfile,
    findCreatedProjects,
    findJoinedProjects
};
