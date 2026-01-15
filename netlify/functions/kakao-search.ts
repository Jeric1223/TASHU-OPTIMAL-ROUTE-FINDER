import { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
    try {
        const { query } = event.queryStringParameters || {}

        if (!query) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'query parameter is required' }),
            }
        }

        const kakaoKey = process.env.KAKAO_API_KEY

        if (!kakaoKey) {
            console.error('KAKAO_API_KEY not found in environment variables')
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API configuration error' }),
            }
        }

        const response = await fetch(
            `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `KakaoAK ${kakaoKey}`,
                },
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Kakao API error:', response.status, errorText)
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Failed to search location' }),
            }
        }

        const data = await response.json()

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'public, max-age=300',
            },
            body: JSON.stringify(data),
        }
    } catch (error) {
        console.error('Kakao search function error:', error)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        }
    }
}
