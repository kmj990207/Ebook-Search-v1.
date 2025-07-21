const axios = require('axios');

module.exports = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: '대상 URL이 필요합니다.' });
    let targetUrl;
    try { targetUrl = new URL(url); }
    catch { return res.status(400).json({ error: '유효하지 않은 URL입니다.' }); }
    const allowedDomains = [
      'select.ridibooks.com', 'search-api.ridibooks.com', 'cremaclub.yes24.com',
      'aladin.co.kr', 'www.aladin.co.kr', 'search.kyobobook.co.kr',
      'elib.seoul.go.kr', 'ebooks.catholic.ac.kr'
    ];
    if (!allowedDomains.includes(targetUrl.hostname)) return res.status(403).json({ error: '허용되지 않은 도메인입니다.' });
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: '*/*'
      }
    });
    res.setHeader('Content-Type', response.headers['content-type'] || 'text/plain');
    res.send(response.data);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: '요청 시간 초과', message: '대상 서버 응답이 너무 느립니다.' });
    } else if (error.response) {
      res.status(error.response.status).json({ error: '대상 서버 오류', message: `상태 코드: ${error.response.status}`, details: error.response.statusText });
    } else {
      res.status(500).json({ error: '프록시 서버 오류', message: error.message || '프록시 처리 중 오류 발생' });
    }
  }
};
