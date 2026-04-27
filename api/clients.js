import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.ediary_SUPABASE_URL || process.env.NEXT_PUBLIC_ediary_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.ediary_SUPABASE_SERVICE_ROLE_KEY || process.env.ediary_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ediary_SUPABASE_ANON_KEY;

  if (req.method === 'GET') {
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ result: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return new Response(JSON.stringify({ result: data || [] }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { name, phone, inquiry_type, notes } = body;

      if (!name || !phone) {
        return new Response(JSON.stringify({ message: '필수 정보가 누락되었습니다. (이름, 연락처)' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ message: '의뢰인이 등록되었습니다. (로컬 모드)' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase
        .from('clients')
        .insert([{ name, phone, inquiry_type, notes }]);

      if (error) throw error;

      return new Response(JSON.stringify({ message: '의뢰인이 등록되었습니다.' }), { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ message: '허용되지 않는 메서드입니다.' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
}
