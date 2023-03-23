"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");

const express = require("express");
const { BadRequestError } = require("../expressError");
const { ensureAdminUser } = require("../middleware/auth");
const Jobs = require("../models/jobs");
const jobNewSchema = require("../schemas/jobNewAdd.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearchFilter.json");

const router = express.Router({ mergeParams: true });


/**
 * GET route
 * should return {job: [{ id, title, salary, equity, companyHandle, companyName}]}
 * 
 * Can provide search filters
 * 
 */

router.get('/', async function (req, res, next){
    const qs = req.query;

    if(qs.minSalary !== undefined) qs.minSalary = +qs.minSalary;
    qs.hasEquity = qs.hasEquity === "true";

    try{
        const validator = jsonschema.validate(qs, jobSearchSchema);
        if(!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
    }

    const jobs = await Jobs.findAll(qs);
    return res.json({jobs});
    } catch (err) {
        return next (err);
    }
});

// Get route by Job ID 
// Returns {id, title, salary, equity,company }
//  where company is { handle, name, description, numEmployees, logo_url }

router.get("/:id", async function (req, res, next) {
    try {
        const job = await Jobs.get(req.params.id);
        return res.json({job});
    } catch (err) {
        return next(err);
    }
})

/**
 * POST { job } => { job }
 * should include {title, salary, equity, companyHandle }
 * should return {id, title, salary, equity, companyHandle }
 */

router.post('/', ensureAdminUser, async function(req, res, next) {
    try {
        const validator = jsconschema.validate(req.body, jobNewSchema);
        if(!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Jobs.create(req.body);
        return res.status(201).json({ job });
    } catch (err) {
        return next (err);
    }
});

/**
 * Patch route to update a job provided an ID
 * CAN ONLY BE DONE BY ADMIN
 */

router.patch('/:id', ensureAdminUser, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if(!validator.valid) {
            const errs = validator.errors.map( e => e.stach);
            throw new BadRequestError(errs);
        }

        const job = await Jobs.update(req.params.id, req.body);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
})

/**
 * Delete route
 * can only b done by admin
 */

router.delete('/:id', ensureAdminUser, async function(req, res, next){
    try {
        await Jobs.remove(req.params.id);
        return res.json({ deleted: +req.params.id });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;