-- Employee Manager schema (SQLite dialect).
-- Everything here is plain ANSI-style SQL; to move to MySQL/PostgreSQL swap
-- "INTEGER PRIMARY KEY AUTOINCREMENT" for AUTO_INCREMENT / SERIAL and
-- "INSERT OR IGNORE" for "INSERT IGNORE" / "ON CONFLICT DO NOTHING".

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS employees (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
    department_id INTEGER NOT NULL,
    role          TEXT    NOT NULL CHECK (length(role) BETWEEN 2 AND 60),
    salary        REAL    NOT NULL CHECK (salary > 0),
    join_date     TEXT    NOT NULL,                     -- ISO date: YYYY-MM-DD
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Indexes chosen for the queries the UI actually runs:
-- filter by department, sort by name / join date.
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_name       ON employees(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_employees_join_date  ON employees(join_date);

INSERT OR IGNORE INTO departments (name) VALUES
    ('Engineering'),
    ('Human Resources'),
    ('Finance'),
    ('Marketing'),
    ('Sales'),
    ('Operations'),
    ('Customer Support');
