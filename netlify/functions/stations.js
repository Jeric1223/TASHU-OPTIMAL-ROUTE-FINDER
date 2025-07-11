// netlify/functions/stations.js

const TASHU_API_URL = "https://bikeapp.tashu.or.kr:50041/v1/openapi/station";

exports.handler = async function (event, context) {
    // Netlify 환경 변수에서 API 키를 가져옵니다.
    const apiKey = process.env.VITE_TASHU_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "타슈 API 키가 서버에 설정되지 않았습니다." }),
        };
    }

    try {
        const response = await fetch(TASHU_API_URL, {
            method: "GET",
            headers: {
                "api-token": apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Tashu API Error:", errorText);
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: `타슈 API 서버에서 오류가 발생했습니다: ${errorText}` }),
            };
        }

        const data = await response.json();

        // API 응답에 'results' 배열이 있는지 확인합니다.
        if (!data.results || !Array.isArray(data.results)) {
            console.error("Invalid API response format:", data);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "타슈 API 응답 형식이 올바르지 않습니다." }),
            };
        }

        // 프론트엔드에서 사용할 수 있도록 results 배열을 반환합니다.
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data.results),
        };
    } catch (error) {
        console.error("Error in stations function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `서버 내부 오류가 발생했습니다: ${error.message}` }),
        };
    }
};
