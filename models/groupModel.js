const { ObjectId } = require("mongodb");
const { getDB } = require("../db");

const DEFAULT_GROUPS = [
    {
        name: "חלוקת משלוחים לחיילים",
        description: "קבוצה למתנדבים שרוצים לעזור בחלוקת משלוחים ומארזים לחיילים.",
        emoji: "🎖️"
    },
    {
        name: "עזרה לניצולי שואה",
        description: "קבוצה למתנדבים שרוצים לעזור ולתמוך בניצולי שואה.",
        emoji: "🕊️"
    },
    {
        name: "חלוקת מארזי ממתקים בבתי חולים",
        description: "קבוצה למתנדבים שרוצים לשמח ילדים ומטופלים בבתי חולים.",
        emoji: "🍬"
    },
    {
        name: "הצלת בעלי חיים",
        description: "קבוצה למתנדבים שרוצים לעזור לבעלי חיים ולפעול למענם.",
        emoji: "🐾"
    }
];

function groups() {
    return getDB().collection("groups");
}

function messages() {
    return getDB().collection("groupMessages");
}

async function createDefaultGroups() {
    for (const group of DEFAULT_GROUPS) {
        await groups().updateOne(
            { name: group.name, isDefault: true },
            {
                $setOnInsert: {
                    name: group.name,
                    description: group.description,
                    emoji: group.emoji,
                    isDefault: true,
                    members: [],
                    createdBy: null,
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
    }
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAll(filters) {
    const query = {};
    const text = filters.text;
    const userObjectId = new ObjectId(filters.userId);

    if (text) {
        const pattern = new RegExp(escapeRegex(text), "i");
        query.$or = [
            { name: pattern },
            { description: pattern }
        ];
    }

    if (filters.minMembers > 0) {
        query.$expr = {
            $gte: [
                { $size: { $ifNull: ["$members", []] } },
                filters.minMembers
            ]
        };
    }

    if (filters.membership === "joined") {
        query.members = userObjectId;
    }
    else if (filters.membership === "notJoined") {
        query.members = { $ne: userObjectId };
    }

    return groups().find(query).sort({ isDefault: -1, createdAt: 1 }).toArray();
}

function findById(groupId) {
    return groups().findOne({ _id: new ObjectId(groupId) });
}

function findByName(name) {
    return groups().findOne({ name: name });
}

function findCreatedBy(userId) {
    return groups().aggregate([
        { $match: { createdBy: new ObjectId(userId) } },
        {
            $project: {
                name: 1,
                description: 1,
                emoji: 1,
                isDefault: 1,
                memberCount: {
                    $size: { $ifNull: ["$members", []] }
                }
            }
        },
        { $sort: { name: 1 } }
    ]).toArray();
}

function findJoinedBy(userId) {
    return groups().aggregate([
        { $match: { members: new ObjectId(userId) } },
        {
            $project: {
                name: 1,
                description: 1,
                emoji: 1,
                isDefault: 1,
                memberCount: {
                    $size: { $ifNull: ["$members", []] }
                }
            }
        },
        { $sort: { name: 1 } }
    ]).toArray();
}

async function update(groupId, changes) {
    await groups().updateOne(
        { _id: new ObjectId(groupId) },
        { $set: changes }
    );

    return findById(groupId);
}

async function create(group) {
    const result = await groups().insertOne(group);
    return result.insertedId;
}

function join(groupId, userId) {
    return groups().updateOne(
        { _id: new ObjectId(groupId) },
        { $addToSet: { members: new ObjectId(userId) } }
    );
}

function leave(groupId, userId) {
    return groups().updateOne(
        { _id: new ObjectId(groupId) },
        { $pull: { members: new ObjectId(userId) } }
    );
}

async function remove(groupId) {
    await groups().deleteOne({ _id: new ObjectId(groupId) });
    await messages().deleteMany({ groupId: new ObjectId(groupId) });
}

function getMessages(groupId) {
    return messages().find({
        groupId: new ObjectId(groupId)
    }).sort({ createdAt: 1 }).toArray();
}

async function createMessage(message) {
    const result = await messages().insertOne(message);
    return result.insertedId;
}

module.exports = {
    createDefaultGroups,
    findAll,
    findById,
    findByName,
    findCreatedBy,
    findJoinedBy,
    update,
    create,
    join,
    leave,
    remove,
    getMessages,
    createMessage
};
