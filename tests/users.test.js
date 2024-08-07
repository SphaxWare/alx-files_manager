const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;

chai.use(chaiHttp);

const BASE_URL = 'http://localhost:5000';

describe('User Creation Endpoint', () => {
  it('should create a new user', async () => {
    const res = await chai.request(BASE_URL)
      .post('/users')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res).to.have.status(201);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('email').that.equals('test@example.com');
  });
});
