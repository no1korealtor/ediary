export const config = {
  runtime: 'edge', 
};

export default function handler(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.ediary_SUPABASE_URL || process.env.NEXT_PUBLIC_ediary_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.ediary_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ediary_SUPABASE_ANON_KEY;

  return new Response(JSON.stringify({
    url: supabaseUrl,
    key: supabaseAnonKey
  }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
}
