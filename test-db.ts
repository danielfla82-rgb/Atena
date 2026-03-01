import { supabase } from './components/supabase';

async function test() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log("No session");
    return;
  }
  
  const payload1 = {
    id: 'test-1',
    content: 'test',
    color: 'yellow',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: session.user.id
  };
  
  const { error: err1 } = await supabase.from('notes').insert(payload1);
  console.log("Insert without is_bold:", err1 ? err1.message : "Success");
  
  const payload2 = {
    id: 'test-2',
    content: 'test',
    color: 'yellow',
    is_bold: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: session.user.id
  };
  
  const { error: err2 } = await supabase.from('notes').insert(payload2);
  console.log("Insert with is_bold:", err2 ? err2.message : "Success");
  
  if (!err1) await supabase.from('notes').delete().eq('id', 'test-1');
  if (!err2) await supabase.from('notes').delete().eq('id', 'test-2');
}

test();
