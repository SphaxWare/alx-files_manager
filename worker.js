const Queue = require('bull');
const thumbnail = require('image-thumbnail');
const dbClient = require('./utils/db');
const fs = require('fs');
const path = require('path');

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    return done(new Error('Missing fileId'));
  }
  if (!userId) {
    return done(new Error('Missing userId'));
  }

  const fileDocument = await dbClient.getFileById(fileId);

  if (!fileDocument || fileDocument.userId.toString() !== userId) {
    return done(new Error('File not found'));
  }

  const sizes = [500, 250, 100];
  const originalFilePath = fileDocument.localPath;

  try {
    for (const size of sizes) {
      const options = { width: size };
      const thumbnailBuffer = await thumbnail(originalFilePath, options);
      const thumbnailPath = `${originalFilePath}_${size}`;
      fs.writeFileSync(thumbnailPath, thumbnailBuffer);
    }
    done();
  } catch (error) {
    done(error);
  }
});

module.exports = fileQueue;
