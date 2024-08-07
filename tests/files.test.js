const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;

chai.use(chaiHttp);

const BASE_URL = 'http://localhost:5000';

describe('Files Endpoints', () => {
  it('should create a new file', async () => {
    const res = await chai.request(BASE_URL)
      .post('/files')
      .send({
        name: 'testfile.txt',
        type: 'file',
        data: 'dGVzdCBjb250ZW50'
      });
    expect(res).to.have.status(201);
    expect(res.body).to.have.property('id');
  });

  it('should retrieve file by ID', async () => {
    const createRes = await chai.request(BASE_URL)
      .post('/files')
      .send({
        name: 'testfile.txt',
        type: 'file',
        data: 'dGVzdCBjb250ZW50'
      });
    const fileId = createRes.body.id;

    const getRes = await chai.request(BASE_URL).get(`/files/${fileId}`);
    expect(getRes).to.have.status(200);
    expect(getRes.body).to.have.property('id').that.equals(fileId);
  });

  it('should retrieve all files for a specific parentId with pagination', async () => {
    const parentId = 'someParentId';
    const res = await chai.request(BASE_URL).get(`/files?parentId=${parentId}&page=1&size=10`);
    expect(res).to.have.status(200);
    expect(res.body).to.be.an('array');
  });

  it('should start background processing for generating thumbnails for image files', async () => {
    const res = await chai.request(BASE_URL)
      .post('/files')
      .send({
        name: 'testimage.png',
        type: 'image',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAUA'
      });
    expect(res).to.have.status(201);
    expect(res.body).to.have.property('id');
  });

  it('should retrieve file data with size query parameter', async () => {
    const createRes = await chai.request(BASE_URL)
      .post('/files')
      .send({
        name: 'testimage.png',
        type: 'image',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAUA'
      });
    const fileId = createRes.body.id;

    const getRes = await chai.request(BASE_URL).get(`/files/${fileId}/data?size=small`);
    expect(getRes).to.have.status(200);
  });
});
