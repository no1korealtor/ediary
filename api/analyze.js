import { createClient } from '@supabase/supabase-js';

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

    // --- Vercel Serverless Supabase 에 데이터 저장 ---
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.ediary_SUPABASE_URL || process.env.NEXT_PUBLIC_ediary_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.ediary_SUPABASE_SERVICE_ROLE_KEY || process.env.ediary_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ediary_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const payload = {
          user_text: text,
          ai_response: aiText
        };

        const { error: dbError } = await supabase
          .from('diaries')
          .insert([payload]);

        if (dbError) {
          console.error("Supabase 저장 중 오류 발생:", dbError);
          return new Response(
            JSON.stringify({ result: aiText, warning: `디비 저장 실패: ${dbError.message}` }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          console.log("✅ Supabase에 저장 완료!");
        }
      } catch (dbError) {
        console.error("Supabase 저장 네트워크/코드 오류:", dbError);
        return new Response(
            JSON.stringify({ result: aiText, warning: `디비 저장 코드 오류: ${dbError.message}` }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.warn("⚠️ Supabase 환경 변수가 설정되지 않아 저장을 건너뜁니다.");
      return new Response(
        JSON.stringify({ result: aiText, warning: "Supabase 환경설정이 누락되었습니다." }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
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
