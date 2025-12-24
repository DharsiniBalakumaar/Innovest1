const express = require('express');
const User = require('../models/user');

const router = express.Router();

router.get('/pending-users', async (req, res) => {
  const users = await User.find({ status: 'pending' });
  res.json(users);
});

router.put('/approve/:id', async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: 'approved' });
  res.json({ message: 'User approved' });
});

router.put('/reject/:id', async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: 'rejected' });
  res.json({ message: 'User rejected' });
});

module.exports = router;
