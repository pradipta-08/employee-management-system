// Loads some sample people so the table isn't empty on first run.
// Usage: npm run seed   (skips if the table already has rows; pass --force to add anyway)
const db = require('../src/db');
const repo = require('../src/employeeRepo');

const sample = [
  ['Aarav Mehta', 'Engineering', 'Backend Developer', 1250000, '2021-06-14'],
  ['Ishita Banerjee', 'Engineering', 'Frontend Developer', 1100000, '2022-02-01'],
  ['Rohan Das', 'Engineering', 'Engineering Manager', 2400000, '2019-09-23'],
  ['Sneha Kulkarni', 'Human Resources', 'HR Business Partner', 950000, '2020-11-02'],
  ['Farhan Qureshi', 'Finance', 'Senior Accountant', 1050000, '2018-04-16'],
  ['Meera Nair', 'Finance', 'Financial Analyst', 880000, '2023-01-09'],
  ['Kabir Singh', 'Marketing', 'Content Strategist', 720000, '2022-08-29'],
  ['Ananya Roy', 'Marketing', 'Brand Manager', 1320000, '2020-03-02'],
  ['Vikram Joshi', 'Sales', 'Account Executive', 840000, '2023-05-15'],
  ['Pooja Sharma', 'Sales', 'Regional Sales Head', 1980000, '2017-12-04'],
  ['Arjun Pillai', 'Operations', 'Logistics Coordinator', 610000, '2024-02-19'],
  ['Debjani Ghosh', 'Operations', 'Operations Lead', 1450000, '2019-07-08'],
  ['Imran Sheikh', 'Customer Support', 'Support Associate', 420000, '2024-06-03'],
  ['Tanvi Desai', 'Customer Support', 'Support Team Lead', 780000, '2021-10-11'],
  ['Siddharth Rao', 'Engineering', 'DevOps Engineer', 1380000, '2022-11-21'],
];

const { n } = db.prepare('SELECT COUNT(*) AS n FROM employees').get();
if (n > 0 && !process.argv.includes('--force')) {
  console.log(`employees table already has ${n} rows - skipping (use --force to add anyway)`);
} else {
  const insertAll = db.transaction(() => {
    for (const [name, department, role, salary, joinDate] of sample) {
      repo.create({ name, department, role, salary, joinDate });
    }
  });
  insertAll();
  console.log(`Inserted ${sample.length} sample employees`);
}
