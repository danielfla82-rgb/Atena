import { supabase } from './components/supabase';

async function test() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("No user session. Can't test.");
    return;
  }
  console.log("User ID:", user.id);
  const sets = await supabase.from('question_sets').select('*');
  console.log("Sets:", sets.data?.length, sets.error);
  
  const q = await supabase.from('questions').select('*');
  console.log("Questions:", q.data?.length, q.error);
}

test();
