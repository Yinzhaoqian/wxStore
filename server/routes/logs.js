const { Router } = require('express');
const { queryLogs } = require('../services/operation-log');

const router = Router();

router.get('/logs', (req, res) => {
  try {
    const { type, search, startDate, endDate, page, pageSize } = req.query;
    const result = queryLogs({
      type,
      search,
      startDate,
      endDate,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 50,
    });
    res.json({ code: 0, data: result });
  } catch (err) {
    res.status(500).json({ code: -1, message: err.message });
  }
});

module.exports = router;
