import { MongoClient , ObjectId} from 'mongodb';
import redisClient from './redis';


class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.client.connect((err) => {
      if (err) {
        console.error('MongoDB client not connected to the server:', err);
      } else {
        console.log('MongoDB client connected to the server');
      }
    });

    this.db = this.client.db(database);
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const usersCollection = this.db.collection('users');
    return usersCollection.countDocuments();
  }

  async nbFiles() {
    const filesCollection = this.db.collection('files');
    return filesCollection.countDocuments();
  }

  async getUserFromToken(token) {
    const usersCollection = this.db.collection('users');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return null;
    }
    const user = await usersCollection.findOne({ _id: ObjectId(userId) });
    return user;
  }

  async getFileById(id) {
    const filesCollection = this.db.collection('files');
    const file = await filesCollection.findOne({ _id: ObjectId(id) });
    return file;
  }
}

const dbClient = new DBClient();
export default dbClient;
