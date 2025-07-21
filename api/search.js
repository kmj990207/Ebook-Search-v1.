const axios = require('axios');
const xml2js = require('xml2js');

const DEFAULT_TTB_KEY = process.env.ALADIN_TTB_KEY || '';
const xmlParser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });

module.exports = async (req, res) => {
  try {
    const { query, queryType = 'Keyword', maxResults = 10, start = 1, searchTarget = 'Book', version = '20131101', cover = 'Mid' } = req.query;
    if (!DEFAULT_TTB_KEY) {
      return res.status(500).json({ error: 'TTBKey가 설정되지 않았습니다.' });
    }
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: '검색어는 2글자 이상이어야 합니다.' });
    }
    let jsonData = null;
    let lastError = null;
    const outputFormats = ['js', 'json', 'xml'];
    for (const outputFormat of outputFormats) {
      try {
        const response = await axios.get('http://www.aladin.co.kr/ttb/api/ItemSearch.aspx', {
          params: {
            ttbkey: DEFAULT_TTB_KEY,
            Query: query,
            QueryType: queryType,
            MaxResults: maxResults,
            start: start,
            SearchTarget: searchTarget,
            output: outputFormat,
            Version: version,
            Cover: cover,
          },
          timeout: 5000,
          responseType: 'text',
          headers: {
            Accept: '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        if (outputFormat === 'xml') {
          const result = await xmlParser.parseStringPromise(response.data);
          if (result.object && result.object.item) {
            jsonData = {
              totalResults: parseInt(result.object.totalResults) || 0,
              startIndex: parseInt(result.object.startIndex) || 1,
              itemsPerPage: parseInt(result.object.itemsPerPage) || 10,
              item: Array.isArray(result.object.item) ? result.object.item : [result.object.item],
            };
            break;
          }
        } else {
          if (typeof response.data === 'string') {
            if (response.data.includes('(') && response.data.includes(')')) {
              const jsonStr = response.data.replace(/^[^(]*\(/, '').replace(/\);?$/, '');
              jsonData = JSON.parse(jsonStr);
            } else {
              jsonData = JSON.parse(response.data);
            }
          } else {
            jsonData = response.data;
          }
          if (jsonData && !jsonData.errorCode) break;
        }
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    if (!jsonData) throw new Error('모든 응답 형식 파싱 실패: ' + (lastError?.message || '알 수 없는 오류'));
    if (jsonData.errorCode) {
      return res.status(400).json({ error: 'API 오류', message: jsonData.errorMessage || '알라딘 API 오류', errorCode: jsonData.errorCode });
    }
    res.json({
      success: true,
      totalResults: jsonData.totalResults || 0,
      startIndex: jsonData.startIndex || 1,
      itemsPerPage: jsonData.itemsPerPage || 10,
      items: jsonData.item || [],
    });
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: '요청 시간 초과', message: '알라딘 서버 응답이 너무 느립니다.' });
    } else if (error.response) {
      res.status(error.response.status).json({ error: '알라딘 API 오류', message: `상태 코드: ${error.response.status}`, details: error.response.data });
    } else {
      res.status(500).json({ error: '서버 오류', message: error.message || '서버 오류' });
    }
  }
};
