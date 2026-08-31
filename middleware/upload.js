const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

const upload = multer({
    storage: multer.memoryStorage()
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

function uploadImage(fileBuffer) {
    return new Promise(function(resolve, reject) {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "givehand" },
            function(error, result) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            }
        );

        stream.end(fileBuffer);
    });
}

module.exports = {
    upload,
    uploadImage
};
