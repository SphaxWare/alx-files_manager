import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const Bull = require('bull');

const fileQueue = new Bull('fileQueue');
const fs = require('fs');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

export default class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const allowedTypes = ['folder', 'file', 'image'];
    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDocument = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? '0' : new ObjectId(parentId),
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId: fileDocument.parentId,
      });
    }

    const localPath = path.join(FOLDER_PATH, uuidv4());
    await fs.mkdir(FOLDER_PATH, { recursive: true });
    await fs.writeFile(localPath, Buffer.from(data, 'base64'));

    fileDocument.localPath = localPath;

    const result = await dbClient.db.collection('files').insertOne(fileDocument);

    // Add a job to the queue for image thumbnails if the file type is image
    if (type === 'image') {
      await fileQueue.add({ userId, fileId: result.insertedId });
    }

    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId: fileDocument.parentId,
      localPath,
    });
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const fileDoc = {
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    };

    return res.json(fileDoc);
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;
    const skip = page * pageSize;

    const files = await dbClient.db.collection('files').aggregate([
      { $match: { userId: ObjectId(userId), parentId } },
      { $skip: skip },
      { $limit: pageSize },
    ]).toArray();

    const fileDocs = files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    }));

    return res.json(fileDocs);
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });

    const fileDoc = {
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    };

    return res.status(200).json(fileDoc);
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });

    const fileDoc = {
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    };

    return res.status(200).json(fileDoc);
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    try {
      // Retrieve the user based on the token
      const user = await dbClient.getUserFromToken(token);
      if (!user) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Retrieve the file document from the DB based on the ID
      const fileDocument = await dbClient.getFileById(id);
      if (!fileDocument) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Check if the file is not public and if the user is not the owner
      if (!fileDocument.isPublic && fileDocument.userId.toString() !== user._id.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Check if the file type is a folder
      if (fileDocument.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      // Check if the file is locally present
      if (!fs.existsSync(fileDocument.localPath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Get the MIME type based on the file name
      const mimeType = mime.lookup(fileDocument.name) || 'application/octet-stream';

      // Read the file content and return it with the correct MIME type
      const fileContent = await new Promise((resolve, reject) => {
        fs.readFile(fileDocument.localPath, (err, data) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        });
      });

      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileContent);
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
