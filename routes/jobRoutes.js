const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();
const Job = require('../models/job');
const ExcelJS = require('exceljs');

async function scrapeData(tag) {
    const url = `https://id.jobstreet.com/id/${tag}-jobs`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const serverState = $('[data-automation=server-state]').contents().text();
    const jsonString = serverState.split('window.SEEK_REDUX_DATA = ')[1].split('};')[0] + '}';
    return JSON.parse(jsonString);
}

/**
 * @swagger
 * /job/scrape/{tag}:
 *   get:
 *     summary: Scrape job data from JobStreet and save to database
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 *         description: tag for scraping job data
 *     responses:
 *       200:
 *         description: Successfully scraped and saved job data
 *       500:
 *         description: Internal server error
 */
router.get('/scrape/:tag', async (req, res) => {
    const tag = req.params.tag;

    try{
        const result = await scrapeData(tag);
        const jobs = result.results.results.jobs.map((job) => ({
            title: job.title,
            companyName: job.companyName || job.advertiser?.description || '',
            workType: job.workType,
            location: job.jobLocation.label,
            salary: job.salary,
            benefit: job.bulletPoints || [],
            listingDate: job.listingDate,
            tag: tag,
        }));

        await Job.bulkCreate(jobs);
        res.status(200).json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred while scraping the site');
    }
});

/**
 * @swagger
 * /job:
 *   get:
 *     summary: Get all jobs
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter jobs by tag
 *     responses:
 *       200:
 *         description: List of jobs
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
    try {
        let { tag } = req.query;

        const filter = tag ? { tag: tag } : {};

        const jobs = await Job.findAll({ where: filter, order: [['id', 'DESC']] });
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send('Error fetching jobs');
    }
});

/**
 * @swagger
 * /job:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               companyName:
 *                 type: string
 *               workType:
 *                 type: string
 *               locations:
 *                 type: string
 *               salary:
 *                 type: string
 *               bulletPoints:
 *                 type: array
 *                 items:
 *                   type: string
 *               listingDate:
 *                 type: string
 *                 format: date
 *               tag:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', async (req, res) => {
    try {
        const newJob = await Job.create(req.body);
        res.status(201).json(newJob);
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).send('Error creating job');
    }
});

/**
 * @swagger
 * /job/{id}:
 *   get:
 *     summary: Get a job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job data
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.status(200).json(job);
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).send('Error fetching job');
    }
});

/**
 * @swagger
 * /job/{id}:
 *   put:
 *     summary: Update a job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               companyName:
 *                 type: string
 *               workType:
 *                 type: string
 *               locations:
 *                 type: string
 *               salary:
 *                 type: string
 *               bulletPoints:
 *                 type: array
 *                 items:
 *                   type: string
 *               listingDate:
 *                 type: string
 *                 format: date
 *               tag:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Job not found
 */
router.put('/:id', async (req, res) => {
    try {
      const job = await Job.findByPk(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      await job.update(req.body);
      res.status(200).json(job);
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).send('Error updating job');
    }
});

/**
 * @swagger
 * /job/{id}:
 *   delete:
 *     summary: Delete a job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
    try {
      const job = await Job.findByPk(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      await job.destroy();
      res.status(204).json();
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).send('Error deleting job');
    }
});

/**
 * @swagger
 * /job/export:
 *   post:
 *     summary: Export job data to Excel
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         required: false
 *         description: Tag to filter job data
 *     responses:
 *       200:
 *         description: Successfully exported job data to Excel
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Internal server error
 */
router.post('/export', async (req, res) => {
    try {
        let { tag } = req.query;

        const filter = tag ? { tag: tag } : {};

        const jobs = await Job.findAll({ where: filter });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Jobs');

        worksheet.columns = [
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Company Name', key: 'companyName', width: 30 },
            { header: 'Work Type', key: 'workType', width: 15 },
            { header: 'Location', key: 'location', width: 30 },
            { header: 'Salary', key: 'salary', width: 30 },
            { header: 'Benefits', key: 'benefit', width: 50 },
            { header: 'Listing Date', key: 'listingDate', width: 15 },
            { header: 'Tags', key: 'tag', width: 15 },
        ];

        jobs.forEach(job => {
            const capTag = capitalizeWords(job.tag);
            worksheet.addRow({
                title: job.title,
                companyName: job.companyName,
                workType: job.workType,
                location: job.location,
                salary: job.salary,
                benefit: job.benefit ? job.benefit.join(', ') : '',
                listingDate: job.listingDate ? job.listingDate.toISOString().split('T')[0] : '',
                tag: capTag,
            });
        });

        res.setHeader('Content-Disposition', 'attachment; filename=jobs.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while exporting data to Excel');
    }
});

function capitalizeWords(str) {
    return str
      .split('-') // Split the string by the hyphen
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(' '); // Join the words with a space
  }

module.exports = router;