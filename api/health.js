module.exports = (req, res) => {
  res.json({
    status: 'ok',
    url: req.url,
    originalUrl: req.originalUrl,
    headers: {
      'x-invoke-path': req.headers['x-invoke-path'],
      'x-invoke-query': req.headers['x-invoke-query'],
      'x-matched-path': req.headers['x-matched-path'],
      'x-vercel-forwarded-for': req.headers['x-vercel-forwarded-for'],
    }
  });
};
