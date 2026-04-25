import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ message: 'GET 요청만 허용됩니다.' }), { status: 405 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Supabase 환경변수가 없으면 빈 배열과 상태 메시지 반환
    return new Response(JSON.stringify({ result: [], debug_status: "ENV_MISSING" }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // diaries 테이블에서 최신 데이터 100개를 가져옴
    const { data, error } = await supabase
      .from('diaries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (error) {
      throw new Error(`Supabase 조회 실패: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ result: [], debug_status: "NO_KEYS_FOUND" }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 기존 프론트엔드 코드와의 호환성을 위해 속성명 매핑
    const parsedValues = data.map(item => ({
      userText: item.user_text,
      aiResponse: item.ai_response,
      timestamp: item.created_at
    }));

    return new Response(JSON.stringify({ result: parsedValues }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Supabase history fetch error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
