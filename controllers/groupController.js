const path = require("path");
const { ObjectId } = require("mongodb");
const groupModel = require("../models/groupModel");
const userModel = require("../models/userModel");

function showGroups(req, res) {
    res.sendFile(path.join(__dirname, "..", "views", "groups.html"));
}

function showEditGroup(req, res) {
    res.sendFile(path.join(__dirname, "..", "views", "edit-group.html"));
}

function isMember(group, userId) {
    return (group.members || []).some(function(memberId) {
        return memberId.toString() === userId.toString();
    });
}

async function getGroups(req, res) {
    try {
        const userId = req.session.userId;
        await groupModel.createDefaultGroups();
        const groups = await groupModel.findAll();

        const result = groups.map(function(group) {
            const members = group.members || [];

            return {
                _id: group._id,
                name: group.name,
                description: group.description,
                emoji: group.emoji,
                isDefault: group.isDefault,
                createdBy: group.createdBy,
                memberCount: members.length,
                isMember: isMember(group, userId)
            };
        });

        res.json(result);
    }
    catch (error) {
        console.log("GET GROUPS ERROR:", error);
        res.status(500).json({ error: "Could not load groups" });
    }
}

async function createGroup(req, res) {
    try {
        const userId = req.session.userId;
        const name = String(req.body.name || "").trim();
        const description = String(req.body.description || "").trim();

        if (!name) {
            return res.status(400).json({ error: "Please enter a group name" });
        }

        if (await groupModel.findByName(name)) {
            return res.status(400).json({
                error: "A group with this name already exists"
            });
        }

        const newGroup = {
            name: name,
            description: description,
            emoji: "👥",
            isDefault: false,
            members: [new ObjectId(userId)],
            createdBy: new ObjectId(userId),
            createdAt: new Date()
        };

        const insertedId = await groupModel.create(newGroup);

        res.json({
            success: true,
            group: {
                ...newGroup,
                _id: insertedId,
                memberCount: 1,
                isMember: true
            }
        });
    }
    catch (error) {
        console.log("CREATE GROUP ERROR:", error);
        res.status(500).json({ error: "Could not create group" });
    }
}

async function getGroup(req, res) {
    try {
        const groupId = req.params.id;

        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ error: "Invalid group ID" });
        }

        const group = await groupModel.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        const isOwner = !!(
            group.createdBy &&
            group.createdBy.toString() === req.session.userId.toString()
        );

        res.json({
            _id: group._id,
            name: group.name,
            description: group.description,
            isDefault: group.isDefault,
            isOwner: isOwner
        });
    }
    catch (error) {
        console.log("GET GROUP ERROR:", error);
        res.status(500).json({ error: "Could not load group" });
    }
}

async function updateGroup(req, res) {
    try {
        const userId = req.session.userId;
        const groupId = req.params.id;

        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ error: "Invalid group ID" });
        }

        const group = await groupModel.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (group.isDefault === true) {
            return res.status(403).json({
                error: "Permanent groups cannot be edited"
            });
        }

        if (!group.createdBy || group.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({
                error: "Only the creator can edit this group"
            });
        }

        const name = String(req.body.name || "").trim();
        const description = String(req.body.description || "").trim();

        if (!name) {
            return res.status(400).json({ error: "Please enter a group name" });
        }

        if (!description) {
            return res.status(400).json({
                error: "Please enter a group description"
            });
        }

        const existingGroup = await groupModel.findByName(name);

        if (existingGroup && existingGroup._id.toString() !== groupId) {
            return res.status(400).json({
                error: "A group with this name already exists"
            });
        }

        const updatedGroup = await groupModel.update(groupId, {
            name: name,
            description: description
        });

        res.json({
            success: true,
            group: {
                _id: updatedGroup._id,
                name: updatedGroup.name,
                description: updatedGroup.description
            }
        });
    }
    catch (error) {
        console.log("UPDATE GROUP ERROR:", error);
        res.status(500).json({ error: "Could not update group" });
    }
}

async function joinGroup(req, res) {
    try {
        const groupId = req.params.id;

        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ error: "Invalid group ID" });
        }

        const result = await groupModel.join(groupId, req.session.userId);

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Group not found" });
        }

        res.json({ success: true });
    }
    catch (error) {
        console.log("JOIN GROUP ERROR:", error);
        res.status(500).json({ error: "Could not join group" });
    }
}

async function leaveGroup(req, res) {
    try {
        const groupId = req.params.id;

        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ error: "Invalid group ID" });
        }

        await groupModel.leave(groupId, req.session.userId);
        res.json({ success: true });
    }
    catch (error) {
        console.log("LEAVE GROUP ERROR:", error);
        res.status(500).json({ error: "Could not leave group" });
    }
}

async function deleteGroup(req, res) {
    try {
        const userId = req.session.userId;
        const groupId = req.params.id;

        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ error: "Invalid group ID" });
        }

        const group = await groupModel.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (group.isDefault === true) {
            return res.status(403).json({
                error: "Permanent groups cannot be deleted"
            });
        }

        if (!group.createdBy || group.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({
                error: "Only the creator can delete this group"
            });
        }

        await groupModel.remove(groupId);
        res.json({ success: true });
    }
    catch (error) {
        console.log("DELETE GROUP ERROR:", error);
        res.status(500).json({ error: "Could not delete group" });
    }
}

async function getMessages(req, res) {
    try {
        const groupId = req.params.id;

        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ error: "Invalid group ID" });
        }

        const group = await groupModel.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (!isMember(group, req.session.userId)) {
            return res.status(403).json({
                error: "You must join this group first"
            });
        }

        res.json(await groupModel.getMessages(groupId));
    }
    catch (error) {
        console.log("GET GROUP MESSAGES ERROR:", error);
        res.status(500).json({ error: "Could not load messages" });
    }
}

async function sendMessage(req, res) {
    try {
        const userId = req.session.userId;
        const groupId = req.params.id;

        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ error: "Invalid group ID" });
        }

        const text = String(req.body.text || "").trim();

        if (!text) {
            return res.status(400).json({ error: "Message cannot be empty" });
        }

        const group = await groupModel.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (!isMember(group, userId)) {
            return res.status(403).json({
                error: "You must join this group first"
            });
        }

        const user = await userModel.findById(userId, false);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const message = {
            groupId: new ObjectId(groupId),
            userId: new ObjectId(userId),
            username: user.username,
            text: text,
            createdAt: new Date()
        };

        const insertedId = await groupModel.createMessage(message);

        res.json({
            success: true,
            message: { ...message, _id: insertedId }
        });
    }
    catch (error) {
        console.log("SEND GROUP MESSAGE ERROR:", error);
        res.status(500).json({ error: "Could not send message" });
    }
}

module.exports = {
    showGroups,
    showEditGroup,
    getGroups,
    getGroup,
    createGroup,
    updateGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    getMessages,
    sendMessage
};
