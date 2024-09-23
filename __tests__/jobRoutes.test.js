const request = require('supertest');
const express = require('express');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const cheerio = require('cheerio');
const Job = require('../models/job');
const jobRoutes = require('../routes/jobRoutes'); 

const app = express();
app.use(express.json());
app.use('/job', jobRoutes);

const mockAxios = new MockAdapter(axios);

jest.mock('../models/job'); // Mock the Job model

describe('GET /job/scrape/:tag', () => {
  afterEach(() => {
    mockAxios.reset();
  });

  it('should scrape data and save to the database', async () => {
    // Mock the axios call to the job scraping site
    const fakeHTML = `
      <html>
        <body>
          <script data-automation="server-state">
            window.SEEK_REDUX_DATA = {
              "results": {
                "results": {
                  "jobs": [{
                    "title": "Software Engineer",
                    "companyName": "Tech Company",
                    "workType": "Full-time",
                    "jobLocation": {"label": "Jakarta"},
                    "salary": "5000 USD",
                    "bulletPoints": ["Good pay", "Flexible hours"],
                    "listingDate": "2024-09-17T00:00:00Z"
                  }]
                }
              }
            };
          </script>
        </body>
      </html>
    `;
    
    mockAxios.onGet('https://id.jobstreet.com/id/java-jobs').reply(200, fakeHTML);
    
    // Mock Job.bulkCreate to simulate saving to the database
    Job.bulkCreate.mockResolvedValue();

    const response = await request(app).get('/job/scrape/java');

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0]).toEqual({
      title: 'Software Engineer',
      companyName: 'Tech Company',
      workType: 'Full-time',
      location: 'Jakarta',
      salary: '5000 USD',
      benefit: ['Good pay', 'Flexible hours'],
      listingDate: '2024-09-17T00:00:00Z',
      tag: 'java',
    });

    // Verify that the jobs were saved to the database
    expect(Job.bulkCreate).toHaveBeenCalledWith([
      {
        title: 'Software Engineer',
        companyName: 'Tech Company',
        workType: 'Full-time',
        location: 'Jakarta',
        salary: '5000 USD',
        benefit: ['Good pay', 'Flexible hours'],
        listingDate: '2024-09-17T00:00:00Z',
        tag: 'java',
      },
    ]);
  });

  it('should return 500 if scraping fails', async () => {
    mockAxios.onGet('https://id.jobstreet.com/id/java-jobs').networkError();

    const response = await request(app).get('/job/scrape/java');
    
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe('Error occurred while scraping the site');
  });
});

describe('GET /job', () => {
    beforeEach(() => {
        // Clear any previous mocks
        jest.clearAllMocks();
    });

    it('should return a list of jobs when no query parameter is provided', async () => {
        // Mock the Job.findAll method to return a sample list of jobs
        Job.findAll.mockResolvedValue([
            { id: 1, title: 'Software Engineer', companyName: 'Company A', workType: 'Full-time', location: 'Location A', salary: '1000', benefit: [], listingDate: '2024-09-18', tag: 'tech' },
            { id: 2, title: 'Product Manager', companyName: 'Company B', workType: 'Part-time', location: 'Location B', salary: '2000', benefit: [], listingDate: '2024-09-18', tag: 'management' }
        ]);

        const response = await request(app).get('/job');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { id: 1, title: 'Software Engineer', companyName: 'Company A', workType: 'Full-time', location: 'Location A', salary: '1000', benefit: [], listingDate: '2024-09-18', tag: 'tech' },
            { id: 2, title: 'Product Manager', companyName: 'Company B', workType: 'Part-time', location: 'Location B', salary: '2000', benefit: [], listingDate: '2024-09-18', tag: 'management' }
        ]);
    });

    it('should return a filtered list of jobs based on the tag query parameter', async () => {
        // Mock the Job.findAll method to return a filtered list of jobs
        Job.findAll.mockResolvedValue([
            { id: 1, title: 'Software Engineer', companyName: 'Company A', workType: 'Full-time', location: 'Location A', salary: '1000', benefit: [], listingDate: '2024-09-18', tag: 'tech' }
        ]);

        const response = await request(app).get('/job').query({ tag: 'tech' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { id: 1, title: 'Software Engineer', companyName: 'Company A', workType: 'Full-time', location: 'Location A', salary: '1000', benefit: [], listingDate: '2024-09-18', tag: 'tech' }
        ]);
    });

    it('should handle errors and return a 500 status code', async () => {
        // Mock the Job.findAll method to throw an error
        Job.findAll.mockRejectedValue(new Error('Database error'));

        const response = await request(app).get('/job');

        expect(response.status).toBe(500);
        expect(response.text).toBe('Error fetching jobs');
    });
});

describe('GET /jobs/:id', () => {
  beforeEach(() => {
    // Clear any previous mocks
    jest.clearAllMocks();
});
  it('should return a job by ID', async () => {
      const mockJob = { id: 1, title: 'Software Engineer', companyName: 'Company A', workType: 'Full-time', location: 'Location A', salary: '1000', benefit: [], listingDate: '2024-09-18', tag: 'tech' };
      Job.findByPk.mockResolvedValue(mockJob);

      const response = await request(app).get('/job/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJob);
      expect(Job.findByPk).toHaveBeenCalledWith('1');
  });

  it('should return 404 if job not found', async () => {
      Job.findByPk.mockResolvedValue(null); // Mock no job found

      const response = await request(app).get('/job/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Job not found' });
  });

  it('should return 500 on error', async () => {
      Job.findByPk.mockRejectedValue(new Error('Database error')); // Mock an error

      const response = await request(app).get('/job/1');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error fetching job');
  });
});

describe('PUT /jobs/:id', () => {
  beforeEach(() => {
      jest.clearAllMocks();
  });

  it('should update a job by ID', async () => {
      const mockJob = { id: 1, title: 'Software Engineer', companyName: 'Company A', workType: 'Full-time', location: 'Location A', salary: '1000', benefit: [], listingDate: '2024-09-18', tag: 'tech',
          update: jest.fn().mockImplementation(async (data) => {
            // Manually update the mockJob properties
            Object.assign(mockJob, data);
        })
      };

      Job.findByPk.mockResolvedValue(mockJob);

      const updatedData = { title: 'Senior Software Engineer', salary: '1200' };

      const response = await request(app).put('/job/1').send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Senior Software Engineer');
      expect(mockJob.update).toHaveBeenCalledWith(updatedData);
      expect(Job.findByPk).toHaveBeenCalledWith('1');
  });

  it('should return 404 if job not found', async () => {
      Job.findByPk.mockResolvedValue(null); // Mock no job found

      const updatedData = { title: 'Senior Software Engineer' };

      const response = await request(app).put('/job/999').send(updatedData);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Job not found' });
  });

  it('should return 500 on error', async () => {
      const mockJob = {
          id: 1,
          update: jest.fn().mockRejectedValue(new Error('Update error')) // Mock an error during update
      };

      Job.findByPk.mockResolvedValue(mockJob); // Mock finding the job

      const updatedData = { title: 'Senior Software Engineer' };

      const response = await request(app).put('/job/1').send(updatedData);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error updating job');
  });
});

describe('DELETE /jobs/:id', () => {
  beforeEach(() => {
      jest.clearAllMocks();
  });

  afterAll(async () => {
      await Job.sequelize.close(); // Close the database connection
  });

  it('should delete a job by ID', async () => {
      const mockJob = {
          id: 1,
          title: 'Software Engineer',
          destroy: jest.fn().mockResolvedValue() // Mock the destroy method
      };

      Job.findByPk.mockResolvedValue(mockJob); // Mock finding the job

      const response = await request(app).delete('/job/1');

      expect(response.status).toBe(204);
      expect(mockJob.destroy).toHaveBeenCalled(); // Check if destroy was called
      expect(Job.findByPk).toHaveBeenCalledWith('1'); // Ensure findByPk was called
  });

  it('should return 404 if job not found', async () => {
      Job.findByPk.mockResolvedValue(null); // Mock no job found

      const response = await request(app).delete('/job/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Job not found' }); // Ensure correct error response
  });

  it('should return 500 on error', async () => {
      const mockJob = {
          id: 1,
          destroy: jest.fn().mockRejectedValue(new Error('Delete error')) // Mock an error during destroy
      };

      Job.findByPk.mockResolvedValue(mockJob); // Mock finding the job

      const response = await request(app).delete('/job/1');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error deleting job'); // Ensure correct error response
  });
});