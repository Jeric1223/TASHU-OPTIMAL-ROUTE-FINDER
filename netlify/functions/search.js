// netlify/functions/search.js

const KAKAO_KEYWORD_SEARCH_API_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

exports.handler = async function (event) {
    // Netlify 환경 변수에서 API 키를 가져옵니다.
    const apiKey = process.env.VITE_KAKAO_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "API 키가 서버에 설정되지 않았습니다." }),
        };
    }

    const { query } = event.queryStringParameters;

    if (!query) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "검색어가 필요합니다." }),
        };
    }

    const searchUrl = new URL(KAKAO_KEYWORD_SEARCH_API_URL);
    searchUrl.searchParams.append("query", query);

    try {
        const response = await fetch(searchUrl.toString(), {
            method: "GET",
            headers: {
                Authorization: `KakaoAK ${apiKey}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Kakao API Error:", data);
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: data.message || "Kakao API에서 오류가 발생했습니다." }),
            };
        }

        // 프론트엔드가 기대하는 형식으로 데이터를 가공합니다.
        const results = data.documents.map((item) => ({
            name: item.place_name,
            address: item.address_name,
            roadAddress: item.road_address_name,
            coords: {
                latitude: parseFloat(item.y),
                longitude: parseFloat(item.x),
            },
        }));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(results),
        };
    } catch (error) {
        console.error("Error in Netlify function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "장소 검색 중 서버에서 오류가 발생했습니다." }),
        };
    }
};
