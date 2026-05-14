const express = require('express');
const { getReps, createRep, updateRep, deleteRep } = require('../controllers/repController');

const router = express.Router();

router.get('/', getReps);
router.post('/', createRep);
router.put('/:id', updateRep);
router.delete('/:id', deleteRep);

module.exports = router;
