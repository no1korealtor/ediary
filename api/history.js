export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ message: 'GET 요청만 허용됩니다.' }), { status: 405 });
  }

  const redisUrl = process.env.KV_REST_API_URL || process.env.REDIS_URL || process.env['redis.url'];
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN || process.env['redis.token'];

  if (!redisUrl || !redisToken) {
    // Redis 환경변수가 없으면 빈 배열과 상태 메시지 반환
    return new Response(JSON.stringify({ result: [], debug_status: "ENV_MISSING" }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const cleanUrl = redisUrl.endsWith('/') ? redisUrl.slice(0, -1) : redisUrl;

    // 1. SCAN 명령: 'diary_*' 패턴을 가진 키를 찾음 (최대 100개)
    const scanReq = await fetch(cleanUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(["SCAN", "0", "MATCH", "diary_*", "COUNT", 100])
    });
    
    if (!scanReq.ok) {
      throw new Error("Redis SCAN 실패");
    }

    const scanData = await scanReq.json();
    const keys = scanData.result[1];

    if (!keys || keys.length === 0) {
      return new Response(JSON.stringify({ result: [], debug_status: "NO_KEYS_FOUND" }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 시간 순 정렬 (diary_2026... 형태이므로 내림차순 정렬 시 최신 데이터가 가장 위로 옴)
    keys.sort((a, b) => b.localeCompare(a));

    // 2. MGET 명령: 찾은 키들의 모든 데이터를 한 번에 가져옴
    const mgetReq = await fetch(cleanUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(["MGET", ...keys])
    });

    const mgetData = await mgetReq.json();
    const values = mgetData.result;
    
    // 가져온 문자열 값들을 JSON 객체로 파싱
    const parsedValues = values.map(val => {
       if (!val) return null;
       try {
         return typeof val === 'string' ? JSON.parse(val) : val;
       } catch (e) {
         return null;
       }
    }).filter(v => v !== null);

    return new Response(JSON.stringify({ result: parsedValues }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Redis history fetch error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
