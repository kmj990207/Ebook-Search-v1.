module.exports = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ttbkeyConfigured: !!process.env.ALADIN_TTB_KEY,
  });
};
