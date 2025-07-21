const axios = require('axios');
const xml2js = require('xml2js');

const DEFAULT_TTB_KEY = process.env.ALADIN_TTB_KEY || '';
const xmlParser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });

module.exports = async (req, res) => {
  try {
    const { itemId, itemIdType = 'ISBN13', cover = 'Mid', optResult = '' } = req.query;
    if (!DEFAULT_TTB_KEY) return res.status(500).json({ error: 'TTBKey가 설정되지 않았습니다.' });
    if (!itemId) return res.status(400).json({ error: 'ItemId가 필요합니다.' });

    let jsonData = null;
    const outputFormats = ['js', 'json', 'xml'];
    for (const outputFormat of outputFormats) {
      try {
        const response = await axios.get('http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx', {
          params: {
            ttbkey: DEFAULT_TTB_KEY,
            ItemId: itemId,
            ItemIdType: itemIdType,
            output: outputFormat,
            Version: '20131101',
            Cover: cover,
            OptResult: optResult,
          },
          timeout: 5000,
          responseType: 'text',
        });
        if (outputFormat === 'xml') {
          const result = await xmlParser.parseStringPromise(response.data);
          if (result.object && result.object.item) {
            jsonData = {
              item: Array.isArray(result.object.item) ? result.object.item : [result.object.item],
            };
            break;
          }
        } else {
          if (response.data.includes('(') && response.data.includes(')')) {
            const jsonStr = response.data.replace(/^[^(]*\(/, '').replace(/\);?$/, '');
            jsonData = JSON.parse(jsonStr);
          } else {
            jsonData = JSON.parse(response.data);
          }
          if (jsonData && !jsonData.errorCode) break;
        }
      } catch (error) {
        continue;
      }
    }
    if (!jsonData) throw new Error('상품 정보를 가져올 수 없습니다.');
    if (jsonData.errorCode) {
      return res.status(400).json({ error: 'API 오류', message: jsonData.errorMessage || '알라딘 API 오류' });
    }
    res.json({ success: true, item: jsonData.item?.[0] || null });
  } catch (error) {
    res.status(500).json({ error: '서버 오류', message: '상품 정보를 조회할 수 없습니다.' });
  }
};
