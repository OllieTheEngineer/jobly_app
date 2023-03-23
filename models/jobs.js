const db = require("../db");
const { NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

// functions in relation to companies

class Jobs {
    /**
     * Creating a job from data, updates db, and returns a new job data
     *  data should be {title, salary, equity, companyHandle }
     * returns (id, title, salary, equity, comanyHandle)
     */

    static async create(data) {
        const result = await db.query(
            `INSERT INTO jobs (title,
                               salary,
                               equity,
                               company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [
                data.title,
                data.salary,
                data.equity,
                data.companyHandle,
            ]);
        let jobs = result.rows[0];

        return jobs;
    }

    /**
     * Find all jobs (optional filter on searchFilters)
     * 
     * Search Filters:
     * hasEquity ()
     * minSalary
     * title 
     * 
     * Returns [{ id, title, salary, equity, companyHandle, companyName}]
     */

    static async findAllJobs({ hasEquity, minSalary, title } = {}) {
        let query = `SELECT j.id,
                            j.title,
                            j.salary,
                            j.equity,
                            j.company_handle AS "companyHandle",
                            c.name AS "companyName"
                    FROM jobs j
                        LEFT JOIN companies AS c ON c.handle = j.company_handle`;
        let whereExpressions = [];
        let queryValues = [];

        // filtering salary with at least that minimum salary
        if (minSalary !== undefined) {
            queryValues.push(minSalary);
            whereExpressions.push(`salary >= $${queryValues.length}`)
        }
        //  filtering jobs that provide non-zero amnt of equity
        if (hasEquity === true) {
            whereExpressions.push(`equity > 0`);
        }

        if (title !== undefined) {
            // string search
            queryValues.push(`%${title}%`);
            whereExpressions.push(`title ILIKE $${queryValues.length}`);
        }

        // Finalizing query and return the resuts

        query += "ORDER BY title"
        const jobsRes = await db.query(query, queryValues);
        return jobsRes.rows;
    }

    /**
     * Provided a Job ID, return the data about that specific job
     * 
     * should return { id, title, salaray, equity, companyHandle, company}
     *      where company is { handle, name, description, numEmployees, logoUrl}
     * 
     */

    static async get(id) {
        const jobRes = await db.query(
            `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`, [id]
        );

        const job = jobRes.rows[0]
        if (!job) throw new NotFoundError(`No job with id: ${id}`);

        const companiesRes = await db.query(
            `SELECT handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"
            FROM companies
            WHERE handle = $1, [job.companyHandle]`
        );

        // need help understanding this piece of code.

        delete job.companyHandle;
        job.company = companiesRes.rows[0];

        return job;
    }

    /**
     * Partially update job data with `data`
     * Returns { id, title, salary, equity, companyHandle }
     * Throw error if not found
     */

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data, {});
        
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs
                          SET ${setCols}
                          WHERE id = ${idVarIdx}
                          RETURNING id,
                                    title,
                                    salary,
                                    equity,
                                    company_handle AS "companyHandle"`;
        const res = await db.query(querySql,  [...values, id]);
        const job = res.rows[0];

        if (!job) throw new NotFoundError(`No job with id: ${id}`);

        return job;
    }

    /**
     * Deleting a job from database 
     * Throw error if comany is not found
     */

    static async remove(id) {
        const res = await db.query(
            `DELETE
             FROM jobs
             WHERE id = $1
             RETURNING id` , [id]
        );
    const job = res.rows[0];

    if (!job) throw new NotFoundError(`No job found with id: ${id}`);
    }

}

module.exports = Jobs;