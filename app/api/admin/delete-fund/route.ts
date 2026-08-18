import { supabase } from '@/app/lib/supabase';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { id, adminKey } = body;

    const secretKey = process.env.ADMIN_SECRET_KEY;
    if (!secretKey || !adminKey || adminKey !== secretKey) {
      return new Response(
        JSON.stringify({ error: '管理者パスワードが正しくありません。' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ファンドIDが指定されていません。' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('funds')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase Delete Error:', error);
      return new Response(
        JSON.stringify({ error: 'データベースの削除に失敗しました。' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('API Error:', err);
    return new Response(
      JSON.stringify({ error: 'サーバー内部エラーが発生しました。' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}