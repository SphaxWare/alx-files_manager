const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;

chai.use(chaiHttp);

const BASE_URL = 'http://localhost:5000';

describe('Status Endpoints', () => {
  it('should return the status of Redis and DB', async () => {
    const res = await chai.request(BASE_URL).get('/status');
    expect(res).to.have.status(200);
    expect(res.body).to.have.property('redis');
    expect(res.body).to.have.property('db');
  });

  it('should return the stats of users and files', async () => {
    const res = await chai.request(BASE_URL).get('/stats');
    expect(res).to.have.status(200);
    expect(res.body).to.have.property('users');
    expect(res.body).to.have.property('files');
  });
});
