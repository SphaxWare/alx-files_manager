const Bull = require('bull');

const fileQueue = new Bull('fileQueue');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs').promises;
const { ObjectId } = require('mongodb');
const dbClient = require('./utils/db');

fileQueue.process(async (job, done) => {
  try {
    const { userId, fileId } = job.data;

    if (!fileId) {
      return done(new Error('Missing fileId'));
    }

    if (!userId) {
      return done(new Error('Missing userId'));
    }

    const fileDocument = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId)
    });

    if (!fileDocument) {
      return done(new Error('File not found'));
    }

    const filePath = fileDocument.localPath; // Assuming `localPath` is the path where the file is stored

    const sizes = [500, 250, 100];
    await Promise.all(sizes.map(async (size) => {
      const thumbnail = await imageThumbnail(filePath, { width: size });
      await fs.writeFile(`${filePath}_${size}`, thumbnail);
    }));

    done();
  } catch (error) {
    done(error);
  }
});

module.exports = fileQueue;
