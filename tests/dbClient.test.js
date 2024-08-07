const chai = require('chai');
const { expect } = chai;
const dbClient = require('../utils/db');

describe('MongoDB Client', () => {
  it('should connect to MongoDB server', async () => {
    const isAlive = dbClient.isAlive();
    expect(isAlive).to.be.true;
  });

  it('should retrieve the number of users', async () => {
    const nbUsers = await dbClient.nbUsers();
    expect(nbUsers).to.be.a('number');
  });

  it('should retrieve the number of files', async () => {
    const nbFiles = await dbClient.nbFiles();
    expect(nbFiles).to.be.a('number');
  });
});
