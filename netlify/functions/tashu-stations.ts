import { Handler } from '@netlify/functions'

// Mock TASHU stations data for testing/demo purposes
const mockStations = {
    station: [
        {
            id: 'TASHU001',
            name: '대전역 1번 출구',
            x_pos: 36.3293,
            y_pos: 127.4245,
            address: '대전광역시 동구 중앙로 215',
            parking_count: 12,
        },
        {
            id: 'TASHU002',
            name: '충남대학교',
            x_pos: 36.3686,
            y_pos: 127.3450,
            address: '대전광역시 유성구 대학로 99',
            parking_count: 8,
        },
        {
            id: 'TASHU003',
            name: '대전시청',
            x_pos: 36.3504,
            y_pos: 127.3847,
            address: '대전광역시 서구 한밭대로 480',
            parking_count: 15,
        },
        {
            id: 'TASHU004',
            name: '대전과학관',
            x_pos: 36.3866,
            y_pos: 127.3145,
            address: '대전광역시 유성구 어은로 124',
            parking_count: 10,
        },
        {
            id: 'TASHU005',
            name: '카이스트',
            x_pos: 36.3742,
            y_pos: 127.3606,
            address: '대전광역시 유성구 과학로 291',
            parking_count: 9,
        },
        {
            id: 'TASHU006',
            name: '대전시민공원',
            x_pos: 36.3080,
            y_pos: 127.4126,
            address: '대전광역시 중구 시민로 204',
            parking_count: 7,
        },
        {
            id: 'TASHU007',
            name: '홈플러스 신안점',
            x_pos: 36.3249,
            y_pos: 127.4073,
            address: '대전광역시 동구 동부로 184',
            parking_count: 11,
        },
        {
            id: 'TASHU008',
            name: '대전선 월평역',
            x_pos: 36.3446,
            y_pos: 127.3948,
            address: '대전광역시 서구 월평로 10',
            parking_count: 6,
        },
    ],
}

export const handler: Handler = async (event) => {
    try {
        const apiToken = process.env.TASHU_API_KEY

        // If API token is not provided, use mock data for development
        if (!apiToken) {
            console.log('TASHU_API_KEY not found, using mock data')
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Cache-Control': 'public, max-age=60',
                },
                body: JSON.stringify(mockStations),
            }
        }

        // Call real TASHU API with authentication token
        const response = await fetch(
            'https://bikeapp.tashu.or.kr:50041/v1/openapi/station',
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'api-token': apiToken,
                },
            }
        )

        if (!response.ok) {
            console.error('TASHU API error:', response.status)
            // Fall back to mock data on API error
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Cache-Control': 'public, max-age=60',
                },
                body: JSON.stringify(mockStations),
            }
        }

        const data = await response.json()

        // Transform API response to match expected format
        const transformedData = {
            station: (data.results || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                x_pos: item.x_pos,
                y_pos: item.y_pos,
                address: item.address,
                parking_count: item.parking_count,
            })),
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'public, max-age=60',
            },
            body: JSON.stringify(transformedData),
        }
    } catch (error) {
        console.error('TASHU stations function error:', error)
        // Fall back to mock data on error
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'public, max-age=60',
            },
            body: JSON.stringify(mockStations),
        }
    }
}
