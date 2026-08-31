const { ObjectId } = require("mongodb");
const { getDB } = require("../db");

function projects() {
    return getDB().collection("projects");
}

async function create(project) {
    await projects().insertOne(project);
    return project;
}

function findAll() {
    return projects().find().toArray();
}

function findById(projectId) {
    return projects().findOne({ _id: new ObjectId(projectId) });
}

function findCreatedBy(userId) {
    return projects().find({ createdBy: new ObjectId(userId) }).toArray();
}

function findJoinedBy(userId) {
    return projects().find({ joinedBy: new ObjectId(userId) }).toArray();
}

async function join(projectId, userId) {
    const result = await projects().updateOne(
        { _id: new ObjectId(projectId) },
        {
            $inc: { joined: 1 },
            $addToSet: { joinedBy: new ObjectId(userId) }
        }
    );

    return result;
}

async function leave(projectId, userId) {
    await projects().updateOne(
        { _id: new ObjectId(projectId) },
        {
            $inc: { joined: -1 },
            $pull: { joinedBy: new ObjectId(userId) }
        }
    );
}

async function update(projectId, changes) {
    await projects().updateOne(
        { _id: new ObjectId(projectId) },
        { $set: changes }
    );

    return findById(projectId);
}

function remove(projectId) {
    return projects().deleteOne({ _id: new ObjectId(projectId) });
}

function projectsByCategory() {
    return projects().aggregate([
        { $group: { _id: "$category", total: { $sum: 1 } } },
        { $sort: { total: -1 } }
    ]).toArray();
}

function volunteersByCategory() {
    return projects().aggregate([
        {
            $group: {
                _id: "$category",
                total: { $sum: { $ifNull: ["$joined", 0] } }
            }
        },
        { $sort: { total: -1 } }
    ]).toArray();
}

module.exports = {
    create,
    findAll,
    findById,
    findCreatedBy,
    findJoinedBy,
    join,
    leave,
    update,
    remove,
    projectsByCategory,
    volunteersByCategory
};
