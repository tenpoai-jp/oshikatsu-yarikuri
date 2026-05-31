import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数が無い場合は null（その場合アプリはローカル保存だけで動く）
export const supabase = url && key ? createClient(url, key) : null;
