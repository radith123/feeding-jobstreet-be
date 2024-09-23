# Feeding Data Jobstreet

# Hasil Unit Testing

PASS **tests**/jobRoutes.test.js (8.817 s)
GET /job/scrape/:tag
√ should scrape data and save to the database (366 ms)  
 √ should return 500 if scraping fails (290 ms)  
 GET /job  
 √ should return a list of jobs when no query parameter is provided (24 ms)  
 √ should return a filtered list of jobs based on the tag query parameter (30 ms)  
 √ should handle errors and return a 500 status code (90 ms)  
 GET /jobs/:id  
 √ should return a job by ID (61 ms)  
 √ should return 404 if job not found (23 ms)
√ should return 500 on error (298 ms)  
 PUT /jobs/:id  
 √ should update a job by ID (67 ms)  
 √ should return 404 if job not found (18 ms)  
 √ should return 500 on error (43 ms)  
 DELETE /jobs/:id  
 √ should delete a job by ID (87 ms)  
 √ should return 404 if job not found (16 ms)  
 √ should return 500 on error (39 ms)

Test Suites: 1 passed, 1 total
Tests: 14 passed, 14 total
Snapshots: 0 total
Time: 9.126 s
Ran all test suites.
