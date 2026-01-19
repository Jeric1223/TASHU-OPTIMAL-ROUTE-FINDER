const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// SSL 인증서 검증 비활성화 (타슈 API 서버용)
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// CORS 설정
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 헬스 체크
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: '타슈 API 프록시 서버' });
});

// 타슈 API 프록시
app.get('/api/tashu/station', async (req, res) => {
    try {
        const apiToken = process.env.TASHU_API_KEY;

        if (!apiToken) {
            return res.status(500).json({ error: 'TASHU_API_KEY not configured' });
        }

        console.log('Calling TASHU API...');

        const response = await fetch('https://bikeapp.tashu.or.kr:50041/v1/openapi/station', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'api-token': apiToken
            },
            agent: httpsAgent
        });

        console.log('TASHU API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('TASHU API error:', response.status, errorText);
            return res.status(response.status).json({ error: 'TASHU API 요청 실패' });
        }

        const data = await response.json();
        console.log('TASHU API returned', data.results?.length || 0, 'stations');

        // 응답 형식 변환
        const transformedData = {
            station: (data.results || []).map(item => ({
                id: item.id,
                name: item.name,
                x_pos: item.x_pos,
                y_pos: item.y_pos,
                address: item.address,
                parking_count: item.parking_count
            }))
        };

        res.set('Cache-Control', 'public, max-age=60');
        res.json(transformedData);

    } catch (error) {
        console.error('TASHU API proxy error:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 카카오 API 프록시
app.get('/api/kakao/search', async (req, res) => {
    try {
        const query = req.query.query;
        const kakaoApiKey = process.env.KAKAO_API_KEY;

        if (!query) {
            return res.status(400).json({ error: 'query 파라미터가 필요합니다' });
        }

        if (!kakaoApiKey) {
            return res.status(500).json({ error: 'KAKAO_API_KEY not configured' });
        }

        const response = await fetch(
            `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `KakaoAK ${kakaoApiKey}`
                }
            }
        );

        if (!response.ok) {
            console.error('Kakao API error:', response.status);
            return res.status(response.status).json({ error: 'Kakao API 요청 실패' });
        }

        const data = await response.json();
        res.set('Cache-Control', 'public, max-age=300');
        res.json(data);

    } catch (error) {
        console.error('Kakao API proxy error:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

app.listen(PORT, () => {
    console.log(`타슈 API 프록시 서버가 포트 ${PORT}에서 실행 중입니다`);
});
