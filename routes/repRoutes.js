const express = require('express');
const { getReps, createRep, deleteRep } = require('../controllers/repController');

const router = express.Router();

router.get('/', getReps);
router.post('/', createRep);
router.delete('/:id', deleteRep);

module.exports = router;
