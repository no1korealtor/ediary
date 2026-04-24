// Vercel Edge Runtime을 사용하여 콜드 스타트(Cold Start) 지연을 제거하고 매우 빠르게 동작하도록 최적화
export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  // 1. HTTP 메서드 확인 (Edge API의 경우 웹 표준 Request 객체 사용)
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ message: '허용되지 않는 메서드입니다. POST 요청을 사용해주세요.' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 2. 클라이언트로부터 전달받은 데이터(일기 내용) 추출
    const body = await req.json();
    const text = body.text;

    if (!text) {
      return new Response(
        JSON.stringify({ message: '일기 내용(text)이 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. 환경 변수에서 Gemini API 키 가져오기
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ message: '서버 설정 오류: API 키가 누락되었습니다.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Gemini API 호출
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `다음은 사용자의 오늘 하루 일기입니다. 이 일기를 읽고 심리 상담가처럼 다정하고 따뜻하게 위로와 공감의 말을 건네주세요. 답변은 3~4문장으로 짧고 다정하게 해주세요.\n\n일기 내용: ${text}`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;

    // --- Vercel Serverless Redis 에 데이터 저장 ---
    // (Vercel Marketplace 연동 혹은 직접 추가한 환경 변수 사용)
    const redisUrl = process.env.UPSTASH_URL || process.env.KV_REST_API_URL || process.env.REDIS_URL || process.env['redis.url'];
    const redisToken = process.env.UPSTASH_TOKEN || process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN || process.env['redis.token'];

    if (redisUrl && redisToken) {
      try {
        // 1. 고유 ID 생성: 현재 시간을 'diary_YYYYMMDDHHmmssSSS' 포맷으로 만듦
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0'); // 밀리초 3자리
        const timeKey = `${year}${month}${day}${hours}${minutes}${seconds}${ms}`;
        const key = `diary_${timeKey}`;

        // 2. 저장할 데이터 객체 (원본 일기와 AI 답변 묶음)
        const payload = {
          userText: text,
          aiResponse: aiText,
          timestamp: now.toISOString()
        };

        // 3. Redis(Upstash) REST API: 무조건 root url에 Command 배열 형태로 통일
        const cleanUrl = redisUrl.endsWith('/') ? redisUrl.slice(0, -1) : redisUrl;
        const redisReq = await fetch(cleanUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${redisToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(["SET", key, JSON.stringify(payload)])
        });

        if (!redisReq.ok) {
          console.error("Redis 저장 중 서버 오류 발생:", await redisReq.text());
        } else {
          console.log(`✅ Redis에 저장 완료! 키: ${key}`);
        }
      } catch (redisError) {
        console.error("Redis 저장 네트워크/코드 오류:", redisError);
      }
    } else {
      console.warn("⚠️ Redis 환경 변수(KV_REST_API_URL 혹은 redis.url 등)가 설정되지 않아 저장을 건너뜁니다.");
    }
    // ----------------------------------------------

    // 5. 생성된 AI 답변을 Web 표준 Response 객체로 클라이언트에 반환
    return new Response(
      JSON.stringify({ result: aiText }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    // 6. 에러 처리
    console.error('API 분석 중 오류 발생:', error);
    return new Response(
      JSON.stringify({ message: '내부 서버 오류', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
