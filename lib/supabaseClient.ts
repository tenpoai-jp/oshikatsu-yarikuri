import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数が無い場合は null（その場合アプリはローカル保存だけで動く）
// flowType: "implicit" にすると、メールのリンクを「別のブラウザ（メールアプリ内ブラウザ等）」で
// 開いてもログインが成立する（PKCEの検証情報が同一ブラウザに無くてもOK）。スマホでのマジックリンク対策。
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "implicit",
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
